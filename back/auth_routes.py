import fastapi
# FastAPI and related imports
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, status, Body, UploadFile, File
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text, func, and_
from datetime import timedelta, datetime
import uuid
from pydantic import EmailStr
from fastapi import Body
import os
import shutil
from pathlib import Path
import jwt
# Local imports
import crud
import models
import schemas
from schemas import ClaseCreate, ClaseResponse
from Clever_MySQL_conn import get_db

# Optional: Import your email service if needed
# from .services.email_service import send_verification_email

# JWT configuration (ideally from environment variables)
SECRET_KEY = "supersecretkey"  # Change to a secure key, ideally from .env
ALGORITHM = "HS256"
EXPIRATION_MINUTES = 60


authRouter = APIRouter()

# Security scheme
security = HTTPBearer()


# Endpoint para actualizar el perfil del estudiante

@authRouter.put("/update-perfil")
async def update_perfil(perfil: dict = Body(...), db: Session = Depends(get_db)):
    updated_user = crud.update_perfil_estudiante(db, perfil)
    if not updated_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return schemas.UsuarioResponse.from_orm(updated_user)


@authRouter.post("/register", response_model=schemas.UsuarioResponse)  # Importa los esquemas Pydantic definidos para validación de datos
async def register(
    user: schemas.RegistroCreate, # No tiene default, va primero
    background_tasks: BackgroundTasks, # No tiene default, va después de user
    request: Request, # No tiene default, va después de background_tasks
    db: Session = Depends(get_db), # Este tiene default, va al final
    
):
    # Aquí puedes añadir una verificación si el email ya existe
    existing_user = db.query(models.Registro).filter(models.Registro.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado.")

    # Llama a la función CRUD para registrar al usuario, pasando las dependencias necesarias
    new_user = await crud.registro_user(db, user, background_tasks, request)
    return new_user


@authRouter.post("/login")  # Ruta para iniciar sesión y generar token JWT
def login(user: schemas.LoginUsuario, db: Session = Depends(get_db)):  # Importa los esquemas Pydantic definidos para validación de datos
    usuario = crud.autenticar_usuario(db, user.username, user.password)
    print(f"DEBUG LOGIN: usuario={usuario}")
    if not usuario:
        print("DEBUG LOGIN: Credenciales incorrectas")
        raise HTTPException(status_code=400, detail="Credenciales incorrectas")

    # Verificar si es estudiante con matrícula inactiva
    if usuario.tipo_usuario == "estudiante" and not usuario.matricula_activa:
        print("DEBUG LOGIN: Estudiante con matrícula inactiva")
        raise HTTPException(
            status_code=403, 
            detail="Tu matrícula se encuentra inactiva. Contacta con el administrador para activar tu acceso."
        )

    print(f"DEBUG LOGIN: tipo_usuario={getattr(usuario, 'tipo_usuario', None)}")
    expire = datetime.utcnow() + timedelta(minutes=EXPIRATION_MINUTES)
    to_encode = {
        "sub": usuario.username, 
        "exp": expire,
        "tipo_usuario": usuario.tipo_usuario
    }
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    response = {
        "access_token": token,
        "token_type": "bearer",
        "tipo_usuario": getattr(usuario, "tipo_usuario", None),
        "usuario": schemas.UsuarioResponse.from_orm(usuario)
    }
    print(f"DEBUG LOGIN: response={response}")
    return response


@authRouter.get("/verify-email")
async def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(models.Registro).filter(
        models.Registro.verification_token == token
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Token de verificación inválido o expirado.")

    if user.email_verified:
        # Ya verificado, redirigir a una página de "ya verificado" en el frontend
        return RedirectResponse(url="http://localhost:3000/email-already-verified", status_code=status.HTTP_302_FOUND)

    if user.token_expires_at < datetime.utcnow():
        # Token expirado, lanzar error o redirigir a una página para reenviar el email
        raise HTTPException(status_code=400, detail="El token de verificación ha expirado. Por favor, solicita uno nuevo.")

    user.email_verified = True
    user.verification_token = None # Invalida el token después de usarlo
    user.token_expires_at = None
    db.add(user)
    db.commit()
    db.refresh(user)

    # Redirigir al usuario a una página de éxito en tu frontend
    # Por ejemplo, una página que dice "Correo verificado exitosamente"
    return RedirectResponse(url="http://localhost:4200/email-verified-success", status_code=status.HTTP_302_FOUND)

# Ruta para reenviar el correo de verificación
@authRouter.post("/resend-verification-email")
async def resend_verification_email(
    email: EmailStr, # No tiene default, va primero
    background_tasks: BackgroundTasks, # No tiene default
    #request: Request, # No tiene default
    db: Session = Depends(get_db) # Este tiene default, va al final
):
    user = db.query(models.Registro).filter(models.Registro.email == email).first()

    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if user.email_verified:
    
      
        raise HTTPException(status_code=400, detail="El correo electrónico ya ha sido verificado.")
    
    if user.token_expires_at and user.token_expires_at.date() < datetime.utcnow().date():
        raise HTTPException(status_code=400, detail="El token de verificación ha expirado. Por favor, solicita uno nuevo.")


    # Generar nuevo token y fecha de expiración
    new_token = str(uuid.uuid4())
    new_token_expires_at = datetime.utcnow() + timedelta(hours=24)

    user.verification_token = new_token
    user.token_expires_at = new_token_expires_at
    db.add(user)
    db.commit()
    db.refresh(user)

    verification_url = f"{request.base_url}auth/verify-email?token={new_token}"
    # Asegúrate de que send_verification_email esté importada o definida en crud.py
    await crud.send_verification_email(email, user.username, verification_url, background_tasks)

    return {"message": "Correo de verificación reenviado."}


@authRouter.get("/usuario/{username}")
def get_usuario(username: str, db: Session = Depends(get_db)):
    user = db.query(models.Registro).filter(models.Registro.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return schemas.UsuarioResponse.from_orm(user)

# POST: Registrar clase
@authRouter.post("/clases/", response_model=ClaseResponse)
def crear_clase(clase: ClaseCreate, db: Session = Depends(get_db)):
    nueva_clase = crud.crear_clase(db, clase)
    # Mapear estudiantes a esquema de respuesta
    estudiantes = [
        schemas.EstudianteEnClase.from_orm(est)
        for est in nueva_clase.estudiantes
    ]
    return schemas.ClaseResponse(
        id=nueva_clase.id,
        dia=nueva_clase.dia,
        hora=nueva_clase.hora,
        tema=nueva_clase.tema,
        meet_link=nueva_clase.meet_link,
        profesor_username=nueva_clase.profesor_username,
        estudiantes=estudiantes
    )

# GET: Ver clases de un profesor
@authRouter.get("/clases/{profesor_username}", response_model=list[ClaseResponse])
def ver_clases_profesor(profesor_username: str, db: Session = Depends(get_db)):
    clases = crud.obtener_clases_profesor(db, profesor_username)
    respuesta = []
    for clase in clases:
        estudiantes = [
            schemas.EstudianteEnClase.from_orm(est)
            for est in clase.estudiantes
        ]
        respuesta.append(schemas.ClaseResponse(
            id=clase.id,
            dia=clase.dia,
            hora=clase.hora,
            tema=clase.tema,
            meet_link=clase.meet_link,
            profesor_username=clase.profesor_username,
            estudiantes=estudiantes
        ))
    return respuesta

# DELETE batch: eliminar clases con más de N días (default 15). Opcional filtrar por profesor.
@authRouter.delete("/clases/antiguas")
def eliminar_clases_antiguas(
    dias: int = 15,
    profesor_username: str | None = None,
    db: Session = Depends(get_db)
):
    try:
        eliminadas = crud.eliminar_clases_antiguas(db, dias=dias, profesor_username=profesor_username)
        return {"eliminadas": eliminadas, "dias": dias, "profesor_username": profesor_username}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error eliminando clases antiguas: {e}")

@authRouter.delete("/clases/{clase_id}")
def eliminar_clase(clase_id: int, db: Session = Depends(get_db)):
    ok = crud.eliminar_clase(db, clase_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Clase no encontrada o no se pudo eliminar")
    return {"eliminada": True, "id": clase_id}

# POST: Agendar estudiante a clase
from pydantic import BaseModel
from fastapi import Body

# Esquema para recibir el body como { "estudiante_username": "usuario" }
class AgendarEstudianteRequest(BaseModel):
    estudiante_username: str

@authRouter.post("/clases/{clase_id}/agendar-estudiante", response_model=ClaseResponse)
def agendar_estudiante(clase_id: int, body: AgendarEstudianteRequest, db: Session = Depends(get_db)):
    clase = crud.agendar_estudiante_a_clase(db, clase_id, body.estudiante_username)
    if not clase:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Clase no encontrada")
    estudiantes = [
        schemas.EstudianteEnClase.from_orm(est)
        for est in clase.estudiantes
    ]
    return schemas.ClaseResponse(
        id=clase.id,
        dia=clase.dia,
        hora=clase.hora,
        tema=clase.tema,
        meet_link=clase.meet_link,
        profesor_username=clase.profesor_username,
        estudiantes=estudiantes
    )

@authRouter.post("/profesor/", response_model=schemas.UsuarioResponse)
async def registrar_profesor(
    user: schemas.RegistroCreate,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db)
):
    if user.tipo_usuario != "profesor":
        raise HTTPException(status_code=400, detail="tipo_usuario debe ser 'profesor'")
    return await crud.registro_user(db, user, background_tasks, request)

# Obtener datos de profesor por username
@authRouter.get("/profesor/{username}", response_model=schemas.UsuarioResponse)
def obtener_profesor(username: str, db: Session = Depends(get_db)):
    profesor = crud.get_profesor_by_username(db, username)
    if not profesor:
        raise HTTPException(status_code=404, detail="Profesor no encontrado")
    return profesor

# Endpoint para obtener estudiantes disponibles (solo tipo_usuario = 'estudiante')
from typing import List
@authRouter.get("/estudiantes-disponibles", response_model=List[schemas.EstudianteEnClase])
def estudiantes_disponibles(db: Session = Depends(get_db)):
    return crud.obtener_estudiantes_disponibles(db)


# GET: Ver clases de un estudiante
@authRouter.get("/clases-estudiante/{estudiante_username}", response_model=list[ClaseResponse])
def ver_clases_estudiante(estudiante_username: str, db: Session = Depends(get_db)):
    """
    Devuelve todas las clases a las que está inscrito un estudiante.
    """
    clases = crud.obtener_clases_estudiante(db, estudiante_username)
    respuesta = []
    for clase in clases:
        estudiantes = [
            schemas.EstudianteEnClase.from_orm(est)
            for est in clase.estudiantes
        ]
        # Buscar el profesor por username
        profesor = crud.get_profesor_by_username(db, clase.profesor_username)
        profesor_nombres = profesor.nombres if profesor else None
        profesor_apellidos = profesor.apellidos if profesor else None
        respuesta.append(schemas.ClaseResponse(
            id=clase.id,
            dia=clase.dia,
            hora=clase.hora,
            tema=clase.tema,
            meet_link=clase.meet_link,
            profesor_username=clase.profesor_username,
            profesor_nombres=profesor_nombres,
            profesor_apellidos=profesor_apellidos,
            estudiantes=estudiantes
        ))
    return respuesta

from typing import List

@authRouter.get("/profesor/", response_model=List[schemas.UsuarioResponse])
def obtener_profesores(db: Session = Depends(get_db)):
    return crud.obtener_profesores(db)

# Endpoints para gestión de matrículas
@authRouter.get("/matriculas/", response_model=List[schemas.UsuarioResponse])
def obtener_matriculas(db: Session = Depends(get_db)):
    """Obtiene todos los estudiantes registrados en la plataforma"""
    return crud.obtener_estudiantes(db)

@authRouter.put("/matriculas/{username}/toggle")
def toggle_matricula(username: str, db: Session = Depends(get_db)):
    """Activa o desactiva la matrícula de un estudiante"""
    estudiante = crud.toggle_matricula_estudiante(db, username)
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    return {
        "username": estudiante.username,
        "matricula_activa": estudiante.matricula_activa,
        "message": f"Matrícula {'activada' if estudiante.matricula_activa else 'desactivada'} exitosamente"
    }

# Endpoints para gestión de unidades
@authRouter.post("/unidades/sync")
def sincronizar_unidades(unidades: List[dict], db: Session = Depends(get_db)):
    """Sincroniza las unidades del frontend con la base de datos"""
    return crud.sincronizar_unidades(db, unidades)

@authRouter.get("/unidades/", response_model=List[dict])
def obtener_unidades(db: Session = Depends(get_db)):
    """Obtiene todas las unidades disponibles"""
    return crud.obtener_unidades(db)

@authRouter.get("/estudiantes/me/unidades-habilitadas")
def obtener_unidades_habilitadas_estudiante(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """Obtiene solo las unidades habilitadas para el estudiante actual"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        tipo_usuario: str = payload.get("tipo_usuario")
        
        print(f"Token decodificado - Usuario: {username}, Tipo: {tipo_usuario}")
        
        if not username:
            raise HTTPException(status_code=401, detail="Token inválido - no se encontró username")
        
        if tipo_usuario != "estudiante":
            print(f"Acceso denegado - tipo_usuario: {tipo_usuario} (esperado: estudiante)")
            raise HTTPException(status_code=403, detail=f"Solo estudiantes pueden acceder a este endpoint. Tipo actual: {tipo_usuario}")
        
        return crud.obtener_unidades_habilitadas_estudiante(db, username)
    except jwt.JWTError as e:
        print(f"Error JWT: {e}")
        raise HTTPException(status_code=401, detail="Token inválido")

@authRouter.get("/estudiantes/{username}/unidades")
def obtener_unidades_estudiante(username: str, db: Session = Depends(get_db)):
    """Obtiene las unidades habilitadas para un estudiante específico"""
    return crud.obtener_unidades_habilitadas_estudiante(db, username)

@authRouter.get("/estudiantes/{username}/unidades/estado")
def obtener_estado_unidades_estudiante(username: str, db: Session = Depends(get_db)):
    """Obtiene todas las unidades con su estado (habilitada/deshabilitada) para gestión"""
    return crud.obtener_estado_unidades_estudiante(db, username)

@authRouter.put("/estudiantes/{username}/unidades/{unidad_id}/toggle")
def toggle_unidad_estudiante(username: str, unidad_id: int, db: Session = Depends(get_db)):
    """Habilita o deshabilita una unidad para un estudiante"""
    resultado = crud.toggle_unidad_estudiante(db, username, unidad_id)
    if resultado is None:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    return {"habilitada": resultado}

# Endpoints para gestión de asignaciones profesor-estudiante
@authRouter.get("/profesores/{profesor_username}/estudiantes")
def obtener_estudiantes_asignados(profesor_username: str, db: Session = Depends(get_db)):
    """Obtiene los estudiantes asignados a un profesor"""
    estudiantes = crud.obtener_estudiantes_asignados(db, profesor_username)
    return [schemas.UsuarioResponse.from_orm(est) for est in estudiantes]

@authRouter.post("/profesores/{profesor_username}/estudiantes/{estudiante_username}")
def asignar_estudiante_profesor(profesor_username: str, estudiante_username: str, db: Session = Depends(get_db)):
    """Asigna un estudiante a un profesor"""
    resultado = crud.asignar_estudiante_profesor(db, profesor_username, estudiante_username)
    if not resultado:
        raise HTTPException(status_code=404, detail="Profesor o estudiante no encontrado")
    return {"message": "Estudiante asignado correctamente"}

@authRouter.delete("/profesores/{profesor_username}/estudiantes/{estudiante_username}")
def desasignar_estudiante_profesor(profesor_username: str, estudiante_username: str, db: Session = Depends(get_db)):
    """Desasigna un estudiante de un profesor"""
    resultado = crud.desasignar_estudiante_profesor(db, profesor_username, estudiante_username)
    if not resultado:
        raise HTTPException(status_code=404, detail="Profesor o estudiante no encontrado")
    return {"message": "Estudiante desasignado correctamente"}

@authRouter.get("/estudiantes")
def obtener_todos_estudiantes(db: Session = Depends(get_db)):
    """Obtiene todos los estudiantes registrados"""
    estudiantes = crud.obtener_estudiantes(db)
    return [schemas.UsuarioResponse.from_orm(est) for est in estudiantes]

# ==========================
# Tracking & Analytics (Nuevos)
# ==========================

def _username_from_token(credentials: HTTPAuthorizationCredentials):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub"), payload.get("tipo_usuario")
    except Exception:
        return None, None

@authRouter.post("/tracking/start")
def tracking_start(
    unidad_id: int = Body(..., embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    username, _ = _username_from_token(credentials)
    if not username:
        raise HTTPException(status_code=401, detail="Token inválido")
    return crud.track_activity(db, username=username, unidad_id=unidad_id, tipo_evento="start")

@authRouter.post("/tracking/heartbeat")
def tracking_heartbeat(
    unidad_id: int = Body(..., embed=True),
    duracion_min: int = Body(..., embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    username, _ = _username_from_token(credentials)
    if not username:
        raise HTTPException(status_code=401, detail="Token inválido")
    return crud.track_activity(db, username=username, unidad_id=unidad_id, tipo_evento="heartbeat", duracion_min=duracion_min)

@authRouter.post("/tracking/end")
def tracking_end(
    unidad_id: int = Body(..., embed=True),
    duracion_min: int | None = Body(None, embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    username, _ = _username_from_token(credentials)
    if not username:
        raise HTTPException(status_code=401, detail="Token inválido")
    return crud.track_activity(db, username=username, unidad_id=unidad_id, tipo_evento="end", duracion_min=duracion_min)

@authRouter.put("/progreso/{unidad_id}")
def upsert_progreso(
    unidad_id: int,
    body: dict = Body(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    username, _ = _username_from_token(credentials)
    if not username:
        raise HTTPException(status_code=401, detail="Token inválido")
    porcentaje = body.get("porcentaje_completado")
    score = body.get("score")
    row = crud.upsert_progreso_score(db, username=username, unidad_id=unidad_id, porcentaje_completado=porcentaje, score=score)
    return {
        "unidad_id": row.unidad_id,
        "porcentaje_completado": row.porcentaje_completado,
        "score": row.score,
        "tiempo_dedicado_min": row.tiempo_dedicado_min
    }

@authRouter.get("/analytics/estudiantes/{username}/resumen")
def analytics_resumen(username: str, db: Session = Depends(get_db)):
    return crud.get_analytics_resumen(db, username=username)

@authRouter.get("/analytics/estudiantes/{username}/unidades")
def analytics_unidades(username: str, db: Session = Depends(get_db)):
    return crud.get_analytics_unidades(db, username=username)

# Sistema de archivos para estudiantes - FUERA del backend
UPLOAD_DIR = Path("/Users/sena/Desktop/Ingles/archivos_estudiantes")
UPLOAD_DIR.mkdir(exist_ok=True)

def get_current_user_from_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Extrae el username del token JWT"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        return username
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

@authRouter.post("/estudiantes/subcarpetas/{unidad_id}/{subcarpeta_nombre}/upload")
async def upload_student_file(
    unidad_id: int,
    subcarpeta_nombre: str,
    files: list[UploadFile] = File(...),
    current_user: str = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Endpoint EXCLUSIVO para estudiantes - subir archivos a SOLO TAREAS"""
    
    # RESTRICCIÓN: Solo subcarpeta "SOLO TAREAS"
    if subcarpeta_nombre != "SOLO TAREAS":
        raise HTTPException(
            status_code=403, 
            detail="Los estudiantes solo pueden subir archivos a 'SOLO TAREAS'"
        )
    
    # Verificar acceso del estudiante a la unidad
    print(f"🔍 DEBUG: current_user={current_user}, unidad_id={unidad_id}, subcarpeta={subcarpeta_nombre}")
    
    # Primero obtener el ID del estudiante
    estudiante = db.query(models.Registro).filter(models.Registro.username == current_user).first()
    if not estudiante:
        print(f"❌ DEBUG: Usuario {current_user} no encontrado")
        raise HTTPException(status_code=403, detail="Usuario no encontrado")
    
    print(f"✅ DEBUG: Estudiante encontrado: ID={estudiante.identificador}")
    
    # Verificar relación en tabla estudiante_unidad
    acceso = db.query(models.estudiante_unidad).filter(
        models.estudiante_unidad.c.estudiante_id == estudiante.identificador,
        models.estudiante_unidad.c.unidad_id == unidad_id,
        models.estudiante_unidad.c.habilitada == True
    ).first()
    
    print(f"🔍 DEBUG: Buscando acceso para estudiante_id={estudiante.identificador}, unidad_id={unidad_id}")
    print(f"🔍 DEBUG: Resultado acceso: {acceso}")
    
    if not acceso:
        print(f"❌ DEBUG: Sin acceso - estudiante_id={estudiante.identificador}, unidad_id={unidad_id}")
        raise HTTPException(status_code=403, detail="No tienes acceso a esta unidad")
    
    # Directorio específico para estudiantes
    student_dir = UPLOAD_DIR / "estudiantes" / current_user / f"unidad_{unidad_id}" / "SOLO_TAREAS"
    student_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"✅ DEBUG: Directorio creado: {student_dir}")
    
    # Procesar múltiples archivos
    allowed_extensions = {'.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.zip', '.rar'}
    uploaded_files = []
    
    for file in files:
        print(f"🔍 DEBUG: Procesando archivo: {file.filename}")
        
        # Validar extensión
        file_extension = Path(file.filename).suffix.lower()
        if file_extension not in allowed_extensions:
            print(f"❌ DEBUG: Archivo rechazado: {file.filename} - extensión {file_extension}")
            continue
        
        # Nombre único
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{timestamp}_{file.filename}"
        file_path = student_dir / safe_filename
        
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            uploaded_files.append({
                "filename": safe_filename,
                "original_filename": file.filename,
                "file_size": file_path.stat().st_size,
            })
            print(f"✅ DEBUG: Archivo guardado: {safe_filename}")
            
        except Exception as e:
            print(f"❌ DEBUG: Error guardando {file.filename}: {e}")
            if file_path.exists():
                file_path.unlink()
    
    return {
        "message": f"Archivos subidos exitosamente: {len(uploaded_files)}",
        "uploaded_files": uploaded_files,
        "unidad_id": unidad_id,
        "subcarpeta": subcarpeta_nombre,
        "uploaded_by": current_user,
        "upload_date": datetime.now().isoformat()
    }

@authRouter.get("/estudiantes/subcarpetas/{unidad_id}/{subcarpeta_nombre}/files")
def get_student_files(
    unidad_id: int,
    subcarpeta_nombre: str,
    current_user: str = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Listar archivos subidos por el estudiante"""
    
    if subcarpeta_nombre != "SOLO TAREAS":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    # Verificar acceso
    # Primero obtener el ID del estudiante
    estudiante = db.query(models.Registro).filter(models.Registro.username == current_user).first()
    if not estudiante:
        raise HTTPException(status_code=403, detail="Usuario no encontrado")
    
    # Verificar relación en tabla estudiante_unidad
    acceso = db.query(models.estudiante_unidad).filter(
        models.estudiante_unidad.c.estudiante_id == estudiante.identificador,
        models.estudiante_unidad.c.unidad_id == unidad_id,
        models.estudiante_unidad.c.habilitada == True
    ).first()
    
    if not acceso:
        raise HTTPException(status_code=403, detail="Sin acceso a esta unidad")
    
    student_dir = UPLOAD_DIR / "estudiantes" / current_user / f"unidad_{unidad_id}" / "SOLO_TAREAS"
    
    if not student_dir.exists():
        return {"files": []}
    
    files = []
    for file_path in student_dir.iterdir():
        if file_path.is_file():
            stat = file_path.stat()
            files.append({
                "filename": file_path.name,
                "original_name": file_path.name.split('_', 2)[-1] if '_' in file_path.name else file_path.name,
                "size": stat.st_size,
                "upload_date": datetime.fromtimestamp(stat.st_mtime).isoformat()
            })
    
    return {"files": files}

@authRouter.get("/estudiantes/subcarpetas/{unidad_id}/{subcarpeta_nombre}/files/{filename}")
def get_student_file(
    unidad_id: int,
    subcarpeta_nombre: str,
    filename: str,
    current_user: str = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Servir archivo específico del estudiante"""
    
    if subcarpeta_nombre != "SOLO TAREAS":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    # Verificar acceso (mismo código que en get_student_files)
    estudiante = db.query(models.Registro).filter(models.Registro.username == current_user).first()
    if not estudiante:
        raise HTTPException(status_code=403, detail="Usuario no encontrado")
    
    acceso = db.query(models.estudiante_unidad).filter(
        models.estudiante_unidad.c.estudiante_id == estudiante.identificador,
        models.estudiante_unidad.c.unidad_id == unidad_id,
        models.estudiante_unidad.c.habilitada == True
    ).first()
    
    if not acceso:
        raise HTTPException(status_code=403, detail="Sin acceso a esta unidad")
    
    # Buscar archivo
    student_dir = UPLOAD_DIR / "estudiantes" / current_user / f"unidad_{unidad_id}" / "SOLO_TAREAS"
    file_path = student_dir / filename
    
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    
    # Determinar tipo de contenido
    import mimetypes
    content_type, _ = mimetypes.guess_type(str(file_path))
    if content_type is None:
        content_type = "application/octet-stream"
    
    from fastapi.responses import FileResponse
    return FileResponse(
        path=str(file_path),
        media_type=content_type,
        filename=filename
    )

@authRouter.get("/estudiantes/resumen")
def get_resumen_estudiante(
    current_user: str = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Obtener resumen de progreso del estudiante"""
    
    # Obtener datos del estudiante
    estudiante = db.query(models.Registro).filter(models.Registro.username == current_user).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    # Calcular métricas
    total_tiempo = db.query(func.sum(models.ActividadEstudiante.duracion_min)).filter(
        models.ActividadEstudiante.username == current_user
    ).scalar() or 0
    
    # Contar unidades habilitadas
    unidades_habilitadas = db.query(func.count(models.estudiante_unidad.c.unidad_id)).filter(
        models.estudiante_unidad.c.estudiante_id == estudiante.identificador,
        models.estudiante_unidad.c.habilitada == True
    ).scalar() or 0
    
    # Calcular progreso general (basado en tiempo dedicado)
    progreso_general = min(100, (total_tiempo / 60) * 2) if total_tiempo > 0 else 0
    
    # Calcular racha de días (simplificado)
    dias_recientes = db.query(func.count(func.distinct(func.date(models.ActividadEstudiante.creado_at)))).filter(
        models.ActividadEstudiante.username == current_user,
        models.ActividadEstudiante.creado_at >= datetime.now() - timedelta(days=7)
    ).scalar() or 0
    
    return {
        "progreso_general": int(progreso_general),
        "unidades_completadas": unidades_habilitadas,
        "tiempo_dedicado_min": int(total_tiempo),
        "racha_dias": dias_recientes
    }

@authRouter.get("/estudiantes/analytics/unidades")
def get_analytics_unidades(
    current_user: str = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Obtener analytics por unidad del estudiante"""
    
    estudiante = db.query(models.Registro).filter(models.Registro.username == current_user).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    # Obtener unidades habilitadas con tiempo dedicado
    unidades_query = db.query(
        models.estudiante_unidad.c.unidad_id,
        func.coalesce(func.sum(models.ActividadEstudiante.duracion_min), 0).label('tiempo_total')
    ).outerjoin(
        models.ActividadEstudiante,
        and_(
            models.ActividadEstudiante.username == current_user,
            models.ActividadEstudiante.unidad_id == models.estudiante_unidad.c.unidad_id
        )
    ).filter(
        models.estudiante_unidad.c.estudiante_id == estudiante.identificador,
        models.estudiante_unidad.c.habilitada == True
    ).group_by(models.estudiante_unidad.c.unidad_id).all()
    
    analytics = []
    for unidad_id, tiempo_total in unidades_query:
        # Calcular progreso basado en tiempo (ejemplo: 30 min = 100%)
        progreso = min(100, (tiempo_total / 30) * 100) if tiempo_total > 0 else 0
        
        analytics.append({
            "unidad_id": unidad_id,
            "tiempo_dedicado_min": int(tiempo_total),
            "actividades_completadas": 0,  # TODO: implementar conteo real
            "ultima_actividad": datetime.now().isoformat(),
            "progreso_porcentaje": int(progreso)
        })
    
    return analytics