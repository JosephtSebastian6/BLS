import fastapi
# FastAPI and related imports
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, status, Body
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from jose import jwt
from datetime import timedelta, datetime
import uuid
from pydantic import EmailStr
from fastapi import Body
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

    print(f"DEBUG LOGIN: tipo_usuario={getattr(usuario, 'tipo_usuario', None)}")
    expire = datetime.utcnow() + timedelta(minutes=EXPIRATION_MINUTES)
    to_encode = {"sub": usuario.username, "exp": expire}
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