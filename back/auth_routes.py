import fastapi
# FastAPI and related imports
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, status, Body, UploadFile, File
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text, func, and_
from datetime import timedelta, datetime
import uuid
from pydantic import EmailStr, BaseModel
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
from schemas import QuizCreate, QuizResponse
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


# ===== Helpers/Endpoints de Administración =====
def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        tipo_usuario: str | None = payload.get("tipo_usuario")
        username: str | None = payload.get("sub")
        if tipo_usuario != "admin":
            raise HTTPException(status_code=403, detail="Acceso solo para administradores")
        return {"username": username, "tipo_usuario": tipo_usuario}
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

@authRouter.get("/admin/ping")
def admin_ping(admin=Depends(require_admin)):
    return {"ok": True, "message": "pong", "admin": admin}

def require_roles(roles: list[str]):
    def _dep(credentials: HTTPAuthorizationCredentials = Depends(security)):
        try:
            payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
            tipo_usuario: str | None = payload.get("tipo_usuario")
            username: str | None = payload.get("sub")
            if not tipo_usuario or tipo_usuario not in roles:
                raise HTTPException(status_code=403, detail="Acceso no autorizado para este rol")
            return {"username": username, "tipo_usuario": tipo_usuario}
        except Exception:
            raise HTTPException(status_code=401, detail="Token inválido")
    return _dep


# ===== Gestión de usuarios (solo admin)
@authRouter.get("/admin/usuarios")
def listar_usuarios(q: str | None = None, db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Lista todos los usuarios. Permite filtro básico por username o email con ?q= """
    query = db.query(models.Registro)
    if q:
        like = f"%{q}%"
        query = query.filter((models.Registro.username.like(like)) | (models.Registro.email.like(like)))
    rows = query.order_by(models.Registro.username.asc()).all()
    return [
        {
            "username": r.username,
            "email": r.email,
            "nombres": r.nombres,
            "apellidos": r.apellidos,
            "tipo_usuario": r.tipo_usuario,
            "matricula_activa": r.matricula_activa,
        }
        for r in rows
    ]


class CambiarRolBody(BaseModel):
    tipo_usuario: str


@authRouter.put("/admin/usuarios/{username}/rol")
def cambiar_rol_usuario(username: str, body: CambiarRolBody, db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Cambia el tipo_usuario de un usuario existente. Valores válidos: estudiante, profesor, empresa, admin."""
    valido = {"estudiante", "profesor", "empresa", "admin"}
    if body.tipo_usuario not in valido:
        raise HTTPException(status_code=400, detail=f"tipo_usuario inválido. Válidos: {', '.join(sorted(valido))}")
    user = db.query(models.Registro).filter(models.Registro.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.tipo_usuario = body.tipo_usuario
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "username": user.username,
        "tipo_usuario": user.tipo_usuario,
        "email": user.email,
        "nombres": user.nombres,
        "apellidos": user.apellidos,
    }


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

# ====== Grupos por Unidad (simplificado) ======
class GrupoUnidadCreate(BaseModel):
    profesor_username: str
    unidad_id: int
    estudiantes: list[str] = []

@authRouter.post("/grupos")
def crear_grupo_por_unidad(body: GrupoUnidadCreate, db: Session = Depends(get_db)):
    """Crea un grupo para una unidad específica, asignando estudiantes a un profesor.
    Mantiene la lógica existente de clases rellenando campos neutrales.
    """
    # Valores por defecto para compatibilidad con Clase
    hoy = datetime.utcnow().strftime("%Y-%m-%d")
    clase_payload = ClaseCreate(
        dia=hoy,
        hora="00:00",
        tema=f"Grupo Unidad {body.unidad_id}",
        meet_link=None,
        profesor_username=body.profesor_username,
        estudiantes=body.estudiantes or []
    )
    nueva = crud.crear_clase(db, clase_payload)
    estudiantes_resp = [schemas.EstudianteEnClase.from_orm(est) for est in nueva.clases if hasattr(nueva, 'clases')] if hasattr(nueva, 'clases') else []
    return schemas.ClaseResponse(
        id=nueva.id,
        dia=nueva.dia,
        hora=nueva.hora,
        tema=nueva.tema,
        meet_link=nueva.meet_link,
        profesor_username=nueva.profesor_username,
        estudiantes=estudiantes_resp
    )

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
def obtener_matriculas(db: Session = Depends(get_db), who=Depends(require_roles(["admin", "empresa"]))):
    """Obtiene todos los estudiantes registrados en la plataforma"""
    return crud.obtener_estudiantes(db)

@authRouter.put("/matriculas/{username}/toggle")
def toggle_matricula(username: str, db: Session = Depends(get_db), who=Depends(require_roles(["admin", "empresa"]))):
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
def sincronizar_unidades(unidades: List[dict], db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Sincroniza las unidades del frontend con la base de datos"""
    return crud.sincronizar_unidades(db, unidades)

@authRouter.get("/unidades/", response_model=List[dict])
def obtener_unidades(db: Session = Depends(get_db), admin=Depends(require_admin)):
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

# Diagnóstico: listar relaciones crudas en estudiante_unidad para un usuario
@authRouter.get("/estudiantes/{username}/unidades/relaciones/raw")
def diagnostico_relaciones_estudiante_unidad(username: str, db: Session = Depends(get_db)):
    estudiante = db.query(models.Registro).filter(models.Registro.username == username).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    filas = db.query(models.estudiante_unidad).filter(
        models.estudiante_unidad.c.estudiante_id == estudiante.identificador
    ).all()
    # mapear a dict legible
    res = [
        {
            "estudiante_id": getattr(f, "estudiante_id", None),
            "unidad_id": getattr(f, "unidad_id", None),
            "habilitada": getattr(f, "habilitada", None)
        }
        for f in filas
    ]
    return {"username": username, "estudiante_id": estudiante.identificador, "relaciones": res}

@authRouter.put("/estudiantes/{username}/unidades/{unidad_id}/toggle")
def toggle_unidad_estudiante(username: str, unidad_id: int, db: Session = Depends(get_db)):
    """Habilita o deshabilita una unidad para un estudiante"""
    resultado = crud.toggle_unidad_estudiante(db, username, unidad_id)
    if resultado is None:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    return {"habilitada": resultado}

# Garantizar que la unidad esté habilitada para el estudiante (crea si no existe)
@authRouter.put("/estudiantes/{username}/unidades/{unidad_id}/ensure-enabled")
def ensure_unidad_habilitada_estudiante(username: str, unidad_id: int, db: Session = Depends(get_db)):
    """Crea el registro estudiante_unidad si no existe y lo deja habilitado=True."""
    # Buscar estudiante
    estudiante = db.query(models.Registro).filter(models.Registro.username == username).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    # Buscar fila existente en estudiante_unidad
    rel = db.query(models.estudiante_unidad).filter(
        models.estudiante_unidad.c.estudiante_id == estudiante.identificador,
        models.estudiante_unidad.c.unidad_id == unidad_id
    ).first()

    try:
        if rel is None:
            # Insertar nueva relación habilitada
            db.execute(
                models.estudiante_unidad.insert().values(
                    estudiante_id=estudiante.identificador,
                    unidad_id=unidad_id,
                    habilitada=True
                )
            )
            db.commit()
            return {"username": username, "unidad_id": unidad_id, "habilitada": True, "created": True}
        else:
            # Actualizar a habilitada=True si estaba False
            db.execute(
                models.estudiante_unidad.update()
                .where(
                    (models.estudiante_unidad.c.estudiante_id == estudiante.identificador) &
                    (models.estudiante_unidad.c.unidad_id == unidad_id)
                )
                .values(habilitada=True)
            )
            db.commit()
            return {"username": username, "unidad_id": unidad_id, "habilitada": True, "created": False}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al asegurar habilitación: {e}")

# Endpoints para gestión de asignaciones profesor-estudiante
@authRouter.get("/profesores/{profesor_username}/estudiantes")
def obtener_estudiantes_asignados(profesor_username: str, db: Session = Depends(get_db)):
    """Obtiene los estudiantes asignados a un profesor"""
    estudiantes = crud.obtener_estudiantes_asignados(db, profesor_username)
    return [schemas.UsuarioResponse.from_orm(est) for est in estudiantes]

# ==========================
# Quizzes por Unidad
# ==========================

@authRouter.post("/unidades/{unidad_id}/quizzes", response_model=QuizResponse)
def crear_quiz_unidad(unidad_id: int, body: QuizCreate, db: Session = Depends(get_db)):
    try:
        # Validación simple de unidad
        unidad = db.query(models.Unidad).filter(models.Unidad.id == unidad_id).first()
        if not unidad:
            raise HTTPException(status_code=404, detail="Unidad no encontrada")

        quiz = models.Quiz(
            unidad_id=unidad_id,
            titulo=body.titulo,
            descripcion=body.descripcion,
            preguntas=body.preguntas,
        )
        db.add(quiz)
        db.commit()
        db.refresh(quiz)
        return QuizResponse.from_orm(quiz)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creando quiz: {e}")

@authRouter.get("/unidades/{unidad_id}/quizzes", response_model=list[QuizResponse])
def listar_quizzes_unidad(unidad_id: int, db: Session = Depends(get_db)):
    quizzes = db.query(models.Quiz).filter(models.Quiz.unidad_id == unidad_id).order_by(models.Quiz.created_at.desc()).all()
    return [QuizResponse.from_orm(q) for q in quizzes]

@authRouter.delete("/unidades/quizzes/{quiz_id}")
def eliminar_quiz(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz no encontrado")
    try:
        db.delete(quiz)
        db.commit()
        return {"eliminado": True, "id": quiz_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo eliminar el quiz: {e}")

@authRouter.get("/unidades/quizzes/{quiz_id}", response_model=QuizResponse)
def obtener_quiz(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz no encontrado")
    return QuizResponse.from_orm(quiz)

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

# Resumen de asignaciones por profesor: cantidad de grupos y estudiantes asignados
@authRouter.get("/profesores/{profesor_username}/resumen-asignaciones")
def resumen_asignaciones_profesor(profesor_username: str, db: Session = Depends(get_db)):
    # Contar estudiantes asignados por la tabla profesor_estudiante
    # Primero obtener el id del profesor
    profesor = db.query(models.Registro).filter(models.Registro.username == profesor_username).first()
    if not profesor:
        raise HTTPException(status_code=404, detail="Profesor no encontrado")
    estudiantes_asignados = db.query(models.profesor_estudiante).filter(models.profesor_estudiante.c.profesor_id == profesor.identificador).count()
    # Conteo real de grupos creados (clases)
    grupos_creados = db.query(models.Clase).filter(models.Clase.profesor_username == profesor_username).count()
    # KPI estimado: 1 grupo por cada 10 estudiantes asignados
    import math
    grupos_estimados = math.ceil(estudiantes_asignados / 10) if estudiantes_asignados > 0 else 0
    return {
        "profesor_username": profesor_username,
        "grupos_creados": int(grupos_creados),
        "grupos_estimados": int(grupos_estimados),
        "estudiantes_asignados": int(estudiantes_asignados)
    }

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
def analytics_resumen(username: str, desde: str | None = None, hasta: str | None = None, db: Session = Depends(get_db)):
    from datetime import datetime
    d_from = datetime.fromisoformat(desde) if desde else None
    d_to = datetime.fromisoformat(hasta) if hasta else None
    return crud.get_analytics_resumen(db, username=username, desde=d_from, hasta=d_to)

@authRouter.get("/analytics/estudiantes/{username}/unidades")
def get_analytics_unidades(username: str, desde: str | None = None, hasta: str | None = None, db: Session = Depends(get_db)):
    from datetime import datetime
    d_from = datetime.fromisoformat(desde) if desde else None
    d_to = datetime.fromisoformat(hasta) if hasta else None
    return crud.get_analytics_unidades(db, username=username, desde=d_from, hasta=d_to)

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
    except Exception as e:
        # Compatibilidad con PyJWT: manejar expiración y otros errores
        try:
            from jwt import exceptions as jwt_exceptions  # type: ignore
            if isinstance(e, jwt_exceptions.ExpiredSignatureError):
                raise HTTPException(status_code=401, detail="Token expirado")
        except Exception:
            pass
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
        # Intento de auto-reparación: crear/activar la relación y reintentar
        try:
            db.execute(
                models.estudiante_unidad.insert().values(
                    estudiante_id=estudiante.identificador,
                    unidad_id=unidad_id,
                    habilitada=True
                )
            )
            db.commit()
            print("🛠️ DEBUG: Relación creada por auto-reparación")
        except Exception:
            db.rollback()
            # Si ya existía, forzar update habilitada=True
            try:
                db.execute(
                    models.estudiante_unidad.update()
                    .where(
                        (models.estudiante_unidad.c.estudiante_id == estudiante.identificador) &
                        (models.estudiante_unidad.c.unidad_id == unidad_id)
                    )
                    .values(habilitada=True)
                )
                db.commit()
                print("🛠️ DEBUG: Relación actualizada a habilitada=True por auto-reparación")
            except Exception as e2:
                db.rollback()
                print(f"⚠️ DEBUG: Falló auto-reparación: {e2}")
        # Revalidar acceso
        acceso = db.query(models.estudiante_unidad).filter(
            models.estudiante_unidad.c.estudiante_id == estudiante.identificador,
            models.estudiante_unidad.c.unidad_id == unidad_id,
            models.estudiante_unidad.c.habilitada == True
        ).first()
        if not acceso:
            # LOG extra: listar relaciones existentes para el estudiante
            try:
                relaciones = db.query(models.estudiante_unidad).filter(
                    models.estudiante_unidad.c.estudiante_id == estudiante.identificador
                ).all()
                print(f"🔎 DEBUG: Relaciones estudiante_unidad del estudiante {estudiante.identificador}: {relaciones}")
            except Exception as e:
                print(f"⚠️ DEBUG: No se pudo listar relaciones estudiante_unidad: {e}")
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
        # Auto-reparación
        try:
            db.execute(
                models.estudiante_unidad.insert().values(
                    estudiante_id=estudiante.identificador,
                    unidad_id=unidad_id,
                    habilitada=True
                )
            )
            db.commit()
        except Exception:
            db.rollback()
            try:
                db.execute(
                    models.estudiante_unidad.update()
                    .where(
                        (models.estudiante_unidad.c.estudiante_id == estudiante.identificador) &
                        (models.estudiante_unidad.c.unidad_id == unidad_id)
                    )
                    .values(habilitada=True)
                )
                db.commit()
            except Exception:
                db.rollback()
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

# ==========================
# Calificaciones y bonus por unidad (Profesor)
# ==========================

from pydantic import BaseModel

class GradeBody(BaseModel):
    filename: str
    score: int

@authRouter.post("/profesores/{profesor_username}/estudiantes/{estudiante_username}/unidades/{unidad_id}/grade")
def profesor_calificar_tarea(
    profesor_username: str,
    estudiante_username: str,
    unidad_id: int,
    body: GradeBody,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    _ensure_profesor_credentials(profesor_username, credentials)
    if not _estudiante_asignado_a_profesor(db, profesor_username, estudiante_username):
        raise HTTPException(status_code=403, detail="Estudiante no asignado a este profesor")
    # Guardar/actualizar calificación en BD (tarea_calificacion)
    try:
        score = int(max(0, min(100, body.score)))
        row = db.query(models.TareaCalificacion).filter(
            models.TareaCalificacion.estudiante_username == estudiante_username,
            models.TareaCalificacion.unidad_id == unidad_id,
            models.TareaCalificacion.filename == body.filename,
        ).first()
        now = datetime.utcnow()
        if row:
            row.score = score
            row.updated_at = now
            db.add(row)
        else:
            row = models.TareaCalificacion(
                estudiante_username=estudiante_username,
                unidad_id=unidad_id,
                filename=body.filename,
                score=score,
                created_at=now,
                updated_at=now,
            )
            db.add(row)
        db.commit()
        db.refresh(row)
        return {"ok": True, "unidad_id": unidad_id, "filename": body.filename, "score": row.score}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo guardar la calificación: {e}")

class BonusBody(BaseModel):
    add_min: int | None = 0
    add_score: int | None = 0

@authRouter.post("/profesores/{profesor_username}/estudiantes/{estudiante_username}/unidades/{unidad_id}/attendance-bonus")
def profesor_bonus_asistencia(
    profesor_username: str,
    estudiante_username: str,
    unidad_id: int,
    body: BonusBody,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    _ensure_profesor_credentials(profesor_username, credentials)
    if not _estudiante_asignado_a_profesor(db, profesor_username, estudiante_username):
        raise HTTPException(status_code=403, detail="Estudiante no asignado a este profesor")
    # Aplicar bonus vía upsert_progreso_score
    try:
        # Recuperar fila actual
        row = crud._ensure_progreso_row(db, username=estudiante_username, unidad_id=unidad_id)
        nuevo_tiempo = (row.tiempo_dedicado_min or 0) + int(max(0, body.add_min or 0))
        nuevo_score = min(100, (row.score or 0) + int(max(0, body.add_score or 0)))
        row.tiempo_dedicado_min = nuevo_tiempo
        row.score = nuevo_score
        row.ultima_actividad_at = datetime.utcnow()
        db.add(row)
        db.commit()
        db.refresh(row)
        return {"ok": True, "unidad_id": unidad_id, "tiempo_dedicado_min": row.tiempo_dedicado_min, "score": row.score}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo aplicar bonus: {e}")

@authRouter.get("/profesores/{profesor_username}/estudiantes/{estudiante_username}/unidades/{unidad_id}/grade")
def profesor_obtener_calificacion(
    profesor_username: str,
    estudiante_username: str,
    unidad_id: int,
    filename: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Obtiene la calificación (si existe) para un archivo específico."""
    _ensure_profesor_credentials(profesor_username, credentials)
    if not _estudiante_asignado_a_profesor(db, profesor_username, estudiante_username):
        raise HTTPException(status_code=403, detail="Estudiante no asignado a este profesor")
    row = db.query(models.TareaCalificacion).filter(
        models.TareaCalificacion.estudiante_username == estudiante_username,
        models.TareaCalificacion.unidad_id == unidad_id,
        models.TareaCalificacion.filename == filename,
    ).first()
    if not row:
        return {"score": None}
    return {"score": int(row.score)}

# ==========================
# Tareas de estudiantes para PROFESOR (solo asignados)
# ==========================
from typing import Optional

def _ensure_profesor_credentials(profesor_username: str, credentials: HTTPAuthorizationCredentials):
    """Valida que el token pertenece a un profesor y coincide con el username del path."""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        tipo = payload.get("tipo_usuario")
        if tipo != "profesor" or sub != profesor_username:
            raise HTTPException(status_code=403, detail="No autorizado")
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

def _estudiante_asignado_a_profesor(db: Session, profesor_username: str, estudiante_username: str) -> bool:
    profesor = db.query(models.Registro).filter(models.Registro.username == profesor_username).first()
    estudiante = db.query(models.Registro).filter(models.Registro.username == estudiante_username).first()
    if not profesor or not estudiante:
        return False
    rel = db.query(models.profesor_estudiante).filter(
        models.profesor_estudiante.c.profesor_id == profesor.identificador,
        models.profesor_estudiante.c.estudiante_id == estudiante.identificador
    ).first()
    return rel is not None

def _listar_tareas_estudiante(username: str, unidad_id: Optional[int] = None):
    tareas = []
    base = UPLOAD_DIR / "estudiantes" / username
    if not base.exists():
        return tareas
    unidades = []
    if unidad_id is not None:
        unidades = [base / f"unidad_{unidad_id}" / "SOLO_TAREAS"]
    else:
        # buscar todas las carpetas unidad_* / SOLO_TAREAS
        for p in base.glob("unidad_*/SOLO_TAREAS"):
            unidades.append(p)
    for carpeta in unidades:
        if not carpeta.exists():
            continue
        try:
            for f in carpeta.iterdir():
                if not f.is_file():
                    continue
                import mimetypes
                stat = f.stat()
                tareas.append({
                    "filename": f.name,
                    "size": stat.st_size,
                    "upload_date": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "unidad_id": int(carpeta.parent.name.replace("unidad_", "")) if carpeta.parent.name.startswith("unidad_") else None,
                })
        except Exception:
            continue
    # ordenar por fecha desc
    tareas.sort(key=lambda x: x.get("upload_date", ""), reverse=True)
    return tareas

@authRouter.get("/profesores/{profesor_username}/tareas")
def profesor_listar_tareas(
    profesor_username: str,
    unidad_id: Optional[int] = None,
    desde: Optional[str] = None,
    hasta: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    _ensure_profesor_credentials(profesor_username, credentials)
    # estudiantes asignados
    profesor = db.query(models.Registro).filter(models.Registro.username == profesor_username).first()
    if not profesor:
        raise HTTPException(status_code=404, detail="Profesor no encontrado")
    asignaciones = db.query(models.profesor_estudiante.c.estudiante_id).filter(models.profesor_estudiante.c.profesor_id == profesor.identificador).all()
    est_ids = [row[0] for row in asignaciones]
    if not est_ids:
        return []
    estudiantes = db.query(models.Registro).filter(models.Registro.identificador.in_(est_ids)).all()
    # filtrar por fecha
    def _en_rango(fecha_iso: str) -> bool:
        if not fecha_iso:
            return True
        try:
            from datetime import datetime as _dt
            dt = _dt.fromisoformat(fecha_iso)
            if desde:
                if dt.date() < _dt.fromisoformat(desde).date():
                    return False
            if hasta:
                if dt.date() > _dt.fromisoformat(hasta).date():
                    return False
            return True
        except Exception:
            return True
    resultado = []
    for est in estudiantes:
        tareas = _listar_tareas_estudiante(est.username, unidad_id)
        tareas = [t for t in tareas if _en_rango(t.get("upload_date"))]
        resultado.append({
            "estudiante_username": est.username,
            "nombres": est.nombres,
            "apellidos": est.apellidos,
            "tareas": tareas
        })
    return resultado

@authRouter.get("/profesores/{profesor_username}/estudiantes/{estudiante_username}/tareas")
def profesor_listar_tareas_de_estudiante(
    profesor_username: str,
    estudiante_username: str,
    unidad_id: Optional[int] = None,
    desde: Optional[str] = None,
    hasta: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    _ensure_profesor_credentials(profesor_username, credentials)
    if not _estudiante_asignado_a_profesor(db, profesor_username, estudiante_username):
        raise HTTPException(status_code=403, detail="Estudiante no asignado a este profesor")
    tareas = _listar_tareas_estudiante(estudiante_username, unidad_id)
    # filtrar por fecha
    def _en_rango(fecha_iso: str) -> bool:
        if not fecha_iso:
            return True
        try:
            from datetime import datetime as _dt
            dt = _dt.fromisoformat(fecha_iso)
            if desde:
                if dt.date() < _dt.fromisoformat(desde).date():
                    return False
            if hasta:
                if dt.date() > _dt.fromisoformat(hasta).date():
                    return False
            return True
        except Exception:
            return True
    tareas = [t for t in tareas if _en_rango(t.get("upload_date"))]
    return {
        "estudiante_username": estudiante_username,
        "tareas": tareas
    }

@authRouter.get("/profesores/{profesor_username}/tareas/download")
def profesor_descargar_tarea(
    profesor_username: str,
    estudiante_username: str,
    unidad_id: int,
    filename: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    _ensure_profesor_credentials(profesor_username, credentials)
    if not _estudiante_asignado_a_profesor(db, profesor_username, estudiante_username):
        raise HTTPException(status_code=403, detail="Estudiante no asignado a este profesor")
    file_path = UPLOAD_DIR / "estudiantes" / estudiante_username / f"unidad_{unidad_id}" / "SOLO_TAREAS" / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
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
    db: Session = Depends(get_db),
    desde: str | None = None,
    hasta: str | None = None,
):
    """Obtener resumen de progreso del estudiante"""
    from datetime import datetime
    d_from = datetime.fromisoformat(desde) if desde else None
    d_to = datetime.fromisoformat(hasta) if hasta else None
    # Obtener datos del estudiante
    estudiante = db.query(models.Registro).filter(models.Registro.username == current_user).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    return crud.get_analytics_resumen(db, username=current_user, desde=d_from, hasta=d_to)

@authRouter.get("/estudiantes/analytics/unidades")
def get_analytics_unidades_current(
    current_user: str = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
    desde: str | None = None,
    hasta: str | None = None,
):
    from datetime import datetime
    d_from = datetime.fromisoformat(desde) if desde else None
    d_to = datetime.fromisoformat(hasta) if hasta else None
    return crud.get_analytics_unidades(db, username=current_user, desde=d_from, hasta=d_to)
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

# ==========================
# Asistencia por clase (persistencia en JSON) + consulta empresa
# ==========================
from pydantic import BaseModel
from typing import Optional
import json

ASISTENCIAS_DIR = Path(__file__).resolve().parent / "asistencias"
ASISTENCIAS_DIR.mkdir(exist_ok=True)

class AsistenciaRegistroIn(BaseModel):
    claseId: int
    fechaISO: Optional[str] = None
    presentes: list[str]

def _asistencia_file(clase_id: int) -> Path:
    return ASISTENCIAS_DIR / f"clase_{clase_id}.json"

def _read_asistencia(clase_id: int) -> dict | None:
    fp = _asistencia_file(clase_id)
    if not fp.exists():
        return None
    try:
        with fp.open('r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return None

def _write_asistencia(clase_id: int, data: dict) -> None:
    fp = _asistencia_file(clase_id)
    with fp.open('w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@authRouter.get("/clases/{clase_id}/asistencia")
def obtener_asistencia(clase_id: int):
    data = _read_asistencia(clase_id)
    return data or {"claseId": clase_id, "presentes": [], "historial": []}

@authRouter.post("/clases/{clase_id}/asistencia")
def guardar_asistencia(clase_id: int, body: AsistenciaRegistroIn):
    # Normalizar
    from datetime import datetime
    fechaISO = body.fechaISO or datetime.utcnow().strftime('%Y-%m-%d')
    current = _read_asistencia(clase_id) or {"claseId": clase_id, "presentes": [], "historial": []}
    current["claseId"] = clase_id
    current["presentes"] = body.presentes
    # Agregar al historial con sello de tiempo
    current.setdefault("historial", []).append({
        "fechaISO": fechaISO,
        "presentes": body.presentes,
        "timestamp": datetime.utcnow().isoformat()
    })
    _write_asistencia(clase_id, current)
    return {"ok": True, "claseId": clase_id, "presentes": body.presentes}

# Consulta para rol empresa: ver asistencia de una clase
@authRouter.get("/empresa/clases/{clase_id}/asistencia")
def empresa_ver_asistencia_clase(clase_id: int, db: Session = Depends(get_db)):
    # Opcionalmente podríamos validar tipo_usuario == 'empresa' si hay auth.
    data = _read_asistencia(clase_id)
    if not data:
        # enriquecer con metadatos de clase aunque no haya asistencia
        clase = db.query(models.Clase).filter(models.Clase.id == clase_id).first()
        if not clase:
            raise HTTPException(status_code=404, detail="Clase no encontrada")
        return {
            "claseId": clase_id,
            "tema": clase.tema,
            "fecha": clase.dia,
            "hora": clase.hora,
            "presentes": [],
            "historial": []
        }
    # Adjuntar metadatos y construir detalle
    clase = db.query(models.Clase).filter(models.Clase.id == clase_id).first()
    if not clase:
        return data
    data.update({"tema": clase.tema, "fecha": clase.dia, "hora": clase.hora})
    presentes_set = set(data.get("presentes") or [])
    detalle = []
    for est in (clase.estudiantes or []):
        nombre = f"{est.nombres or ''} {est.apellidos or ''}".strip()
        ident = est.email or est.username or str(est.identificador)
        detalle.append({
            "nombre": nombre,
            "id": ident,
            "presente": ident in presentes_set
        })
    data["detalle"] = detalle
    # Totales derivados
    data["total"] = len(detalle)
    data["presentes_count"] = sum(1 for d in detalle if d["presente"])
    data["ausentes_count"] = data["total"] - data["presentes_count"]
    return data

# Listado de clases para empresa con estado de asistencia
@authRouter.get("/empresa/clases")
def empresa_listar_clases(desde: str | None = None, hasta: str | None = None, db: Session = Depends(get_db)):
    q = db.query(models.Clase)
    if desde:
        q = q.filter(models.Clase.dia >= desde)
    if hasta:
        q = q.filter(models.Clase.dia <= hasta)
    clases = q.order_by(models.Clase.dia.asc(), models.Clase.hora.asc()).all()
    res = []
    for c in clases:
        asistencia = _read_asistencia(c.id) or {}
        presentes = asistencia.get('presentes') or []
        total_inscritos = len(c.estudiantes or [])
        res.append({
            "id": c.id,
            "dia": c.dia,
            "hora": c.hora,
            "tema": c.tema,
            "profesor_username": c.profesor_username,
            "total_inscritos": total_inscritos,
            "tiene_asistencia": bool(presentes),
            "presentes": len(presentes),
            "ausentes": max(0, total_inscritos - len(presentes)),
        })
    return res