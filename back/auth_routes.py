from __future__ import annotations

# FastAPI and related imports
from sqlalchemy.orm import Session  # necesario para la anotación del helper superior
def _notify_profesores_asignados(db: Session, estudiante_username: str, mensaje: str, unidad_id: int, tipo: str = "info") -> int:
    """Crea notificaciones para todos los profesores asignados a un estudiante.
    No lanza excepciones para no interferir con el flujo principal."""
    try:
        est = db.query(models.Registro).filter(models.Registro.username == estudiante_username).first()
        if not est:
            return 0
        asign = db.query(models.profesor_estudiante.c.profesor_id).filter(
            models.profesor_estudiante.c.estudiante_id == est.identificador
        ).all()
        prof_ids = [row[0] for row in asign]
        count = 0
        for pid in prof_ids:
            try:
                crud.crear_notificacion(
                    db,
                    usuario_id=int(pid),
                    tipo=tipo,
                    mensaje=mensaje,
                    usuario_remitente_id=est.identificador,
                    unidad_id=unidad_id,
                )
                count += 1
            except Exception as e:
                print(f"[WARN] No se pudo crear notificación para profesor_id={pid}: {e}")
        return count
    except Exception as e:
        print(f"[WARN] _notify_profesores_asignados error: {e}")
        return 0

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, status, Body, UploadFile, File
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text, func, and_
from datetime import timedelta, datetime
import uuid
from pydantic import EmailStr, BaseModel
from fastapi import Body
from pathlib import Path
import os
import json
import shutil
import mimetypes
# Local imports
import crud
import models
import schemas
from schemas import ClaseCreate, ClaseResponse
from schemas import QuizCreate, QuizResponse, QuizAsignacionCreate, QuizAsignacionResponse, QuizRespuestaCreate, QuizRespuestaResponse, QuizDetalleEstudiante
from Clever_MySQL_conn import get_db, Base, engine
from settings import settings

# Optional: Import your email service if needed
# from .services.email_service import send_verification_email

# JWT (python-jose)
from jose import jwt

# JWT configuration (centralizado en settings.py)
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
settings.ALGORITHM
EXPIRATION_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES


authRouter = APIRouter()

# Security scheme
security = HTTPBearer()


# ===== Seguridad (helpers) =====
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


# ===== Helpers/Endpoints de Administración =====

# ==========================
# Sistema de Calificaciones (Resumen por estudiante)
# ==========================

@authRouter.get("/grades/estudiantes/{username}/resumen")
def grades_resumen_estudiante(
    username: str,
    objetivo_min: int = 120,
    wt_tareas: float = 0.7,
    wt_tiempo: float = 0.3,
    db: Session = Depends(get_db)
):
    """
    Resumen REAL de calificaciones por estudiante, por unidad y global.
    - objetivo_min: minutos objetivo por unidad para normalizar tiempo (default 120)
    - wt_tareas, wt_tiempo: pesos para promedio de tareas y score de tiempo (deben sumar ~1)
    """
    # Normalizar pesos
    try:
        total_w = max(0.0001, float(wt_tareas) + float(wt_tiempo))
        wt_tareas = float(wt_tareas) / total_w
        wt_tiempo = float(wt_tiempo) / total_w
    except Exception:
        wt_tareas, wt_tiempo = 0.7, 0.3

    # Validación de estudiante
    estudiante = db.query(models.Registro).filter(models.Registro.username == username).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    # Unidades habilitadas para el estudiante
    unidades = db.query(models.Unidad).all()
    resultado = []
    aprobadas = 0
    reprobadas = 0

    TASKS_BASE = Path("/Users/sena/Desktop/Ingles/archivos_estudiantes")

    for u in unidades:
        # Tiempo dedicado (si existe registro en progreso)
        prog = db.query(models.EstudianteProgresoUnidad).filter(
            models.EstudianteProgresoUnidad.username == username,
            models.EstudianteProgresoUnidad.unidad_id == u.id
        ).first()
        tiempo_min = int(getattr(prog, 'tiempo_dedicado_min', 0) or 0)
        tiempo_score = min(100, int((tiempo_min or 0) * 100 / objetivo_min)) if objetivo_min > 0 else 0

        # Promedio de tareas y conteo
        from sqlalchemy import func as sa_func
        avg_score = db.query(sa_func.avg(models.TareaCalificacion.score)).filter(
            models.TareaCalificacion.estudiante_username == username,
            models.TareaCalificacion.unidad_id == u.id
        ).scalar()
        tareas_score_avg = float(avg_score) if avg_score is not None else None

        # Conteo tareas y última entrega desde FS
        tareas_count = 0
        ultima_entrega_iso = None
        carpeta = TASKS_BASE / "estudiantes" / username / f"unidad_{u.id}" / "SOLO_TAREAS"
        try:
            if carpeta.exists() and carpeta.is_dir():
                archivos = [p for p in carpeta.iterdir() if p.is_file()]
                tareas_count = len(archivos)
                if archivos:
                    last = max(archivos, key=lambda p: p.stat().st_mtime)
                    ultima_entrega_iso = datetime.fromtimestamp(last.stat().st_mtime).isoformat()
        except Exception:
            pass

        base_score = tareas_score_avg if tareas_score_avg is not None else 0.0
        final_grade = int(round(wt_tareas * base_score + wt_tiempo * tiempo_score))
        estado = "aprobado" if final_grade >= 60 else "pendiente"
        if estado == "aprobado":
            aprobadas += 1
        else:
            reprobadas += 1

        resultado.append({
            "unidad_id": u.id,
            "nombre": u.nombre,
            "tareas_count": int(tareas_count),
            "tareas_promedio": float(tareas_score_avg) if tareas_score_avg is not None else None,
            "tiempo_min": tiempo_min,
            "tiempo_score": tiempo_score,
            "grade": final_grade,
            "estado": estado,
            "ultima_entrega": ultima_entrega_iso,
        })

    # Promedio global
    grades = [r["grade"] for r in resultado]
    promedio_global = int(round(sum(grades) / len(grades))) if grades else 0

    return {
        "username": username,
        "pesos": {"tareas": wt_tareas, "tiempo": wt_tiempo},
        "objetivo_min": objetivo_min,
        "unidades": resultado,
        "global": {"promedio": promedio_global, "aprobadas": aprobadas, "pendientes": reprobadas}
    }

# ===== Override / Calificación final de unidad =====
class UnidadFinalBody(BaseModel):
    estudiante_username: str
    unidad_id: int
    score: int | None = None
    aprobado: bool | None = None

@authRouter.post("/grades/unidad/final")
def upsert_unidad_final(body: UnidadFinalBody, db: Session = Depends(get_db), who=Depends(require_roles(["profesor", "empresa", "admin"]))):
    """Crea/actualiza una calificación final (override) para una unidad.
    - score: 0..100 opcional
    - aprobado: True/False opcional
    Prioriza este override cuando se construye el estado final (consumido por el frontend).
    """
    if body.score is not None:
        try:
            s = int(body.score)
            if s < 0 or s > 100:
                raise ValueError()
        except Exception:
            raise HTTPException(status_code=400, detail="score debe ser un entero entre 0 y 100")

    # Validación básica de existencia
    estudiante = db.query(models.Registro).filter(models.Registro.username == body.estudiante_username).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    unidad = db.query(models.Unidad).filter(models.Unidad.id == body.unidad_id).first()
    if not unidad:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")

    # Upsert
    row = db.query(models.UnidadCalificacionFinal).filter(
        models.UnidadCalificacionFinal.estudiante_username == body.estudiante_username,
        models.UnidadCalificacionFinal.unidad_id == body.unidad_id
    ).first()
    now = datetime.utcnow()
    if row:
        if body.score is not None:
            row.score = int(body.score)
        if body.aprobado is not None:
            row.aprobado = bool(body.aprobado)
        row.updated_at = now
        db.add(row)
    else:
        row = models.UnidadCalificacionFinal(
            estudiante_username=body.estudiante_username,
            unidad_id=body.unidad_id,
            score=int(body.score) if body.score is not None else None,
            aprobado=bool(body.aprobado) if body.aprobado is not None else None,
            updated_at=now
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    # Notificar al estudiante sobre el cambio de nota final de la unidad
    try:
        est = db.query(models.Registro).filter(models.Registro.username == body.estudiante_username).first()
        remitente = db.query(models.Registro).filter(models.Registro.username == who["username"]).first()
        if est:
            score_txt = "sin nota" if row.score is None else f"{int(row.score)}/100"
            estado_txt = "Aprobado" if bool(row.aprobado) else "Pendiente"
            msg = f"Tu nota final de la unidad {body.unidad_id} fue actualizada: {score_txt} ({estado_txt})."
            crud.crear_notificacion(
                db,
                usuario_id=int(est.identificador),
                tipo="unidad_final_actualizada",
                mensaje=msg,
                usuario_remitente_id=int(remitente.identificador) if remitente else None,
                unidad_id=body.unidad_id,
            )
    except Exception as e:
        print(f"[WARN] Notificación unidad_final_actualizada fallida: {e}")
    return {"id": row.id, "estudiante_username": row.estudiante_username, "unidad_id": row.unidad_id, "score": row.score, "aprobado": row.aprobado}
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

@authRouter.post("/admin/sync-models")
def admin_sync_models(admin=Depends(require_admin)):
    """Crea cualquier tabla faltante según los modelos ORM.
    Útil para entornos sin migraciones. No borra ni altera tablas existentes.
    """
    try:
        Base.metadata.create_all(bind=engine)
        return {"ok": True, "message": "Tablas sincronizadas"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sincronizando modelos: {e}")

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


# ===== Verificación manual de usuarios (solo admin) =====
class VerifyUserBody(BaseModel):
    username: str | None = None
    email: EmailStr | None = None


def _find_user_by_any(db: Session, *, id: int | None = None, username: str | None = None, email: str | None = None):
    q = db.query(models.Registro)
    if id is not None:
        u = q.filter(models.Registro.identificador == id).first()
        if u:
            return u
    if username:
        u = q.filter(models.Registro.username == username).first()
        if u:
            return u
    if email:
        u = q.filter(models.Registro.email == email).first()
        if u:
            return u
    return None


@authRouter.post("/admin/verify-user")
def admin_verify_user(body: VerifyUserBody, db: Session = Depends(get_db)):
    """Marca manualmente a un usuario como verificado (o desverificado).
    Acepta id (identificador), username o email.
    ATENCIÓN: Endpoint sin autenticación a petición del usuario. Considera protegerlo en producción.
    """
    if not body.username and not body.email:
        raise HTTPException(status_code=400, detail="Proporciona 'username' o 'email'.")
    user = _find_user_by_any(db, username=body.username, email=body.email)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Verificar siempre en True (no se expone 'verify' en el body)
    user.email_verified = True
    # Si tu modelo tiene campos de tracking, ajusta aquí; usamos setdefault con hasattr
    if hasattr(user, "verification_token"):
        user.verification_token = None
    if hasattr(user, "token_expires_at"):
        user.token_expires_at = None

    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "message": "Estado de verificación actualizado",
        "user": {
            "username": user.username,
            "email": user.email,
            "email_verified": getattr(user, "email_verified", None),
        },
    }


@authRouter.put("/admin/usuarios/{username}/verify")
def admin_verify_user_by_username(username: str, verify: bool = True, db: Session = Depends(get_db)):
    """Marca/verifica a un usuario por username con query param ?verify=true|false"""
    user = db.query(models.Registro).filter(models.Registro.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.email_verified = bool(verify)
    if hasattr(user, "verification_token") and verify:
        user.verification_token = None
    if hasattr(user, "token_expires_at") and verify:
        user.token_expires_at = None
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "message": "Estado de verificación actualizado",
        "user": {
            "username": user.username,
            "email": user.email,
            "email_verified": getattr(user, "email_verified", None),
        },
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


# ============================
# Olvidé mi contraseña (público)
# ============================
class ForgotPasswordBody(BaseModel):
    username: str | None = None
    email: EmailStr | None = None


@authRouter.post("/forgot-password")
async def forgot_password(body: ForgotPasswordBody, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Genera un token de restablecimiento y envía email con enlace. Reutiliza
    verification_token y token_expires_at para evitar migraciones."""
    if not body.username and not body.email:
        raise HTTPException(status_code=400, detail="Proporciona username o email")

    q = db.query(models.Registro)
    if body.username:
        user = q.filter(models.Registro.username == body.username).first()
    else:
        user = q.filter(models.Registro.email == body.email).first()

    # Seguridad: no revelar si existe o no. Responder 200 siempre.
    if not user:
        return {"message": "Si el usuario existe, se enviará un correo con instrucciones."}

    reset_token = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(hours=2)
    user.verification_token = reset_token
    user.token_expires_at = expires_at
    db.add(user)
    db.commit()
    db.refresh(user)

    # Construir URL de restablecimiento hacia el FRONTEND
    frontend_base = os.getenv("FRONTEND_BASE_URL", "http://localhost:4200")
    reset_url = f"{frontend_base.rstrip('/')}/reset-password?token={reset_token}"

    # Enviar correo
    await crud.send_reset_password_email(
        recipient_email=user.email,
        username=user.username,
        reset_url=reset_url,
        background_tasks=background_tasks,
        request=request,
    )

    return {"message": "Si el usuario existe, se enviará un correo con instrucciones."}


class ResetPasswordBody(BaseModel):
    token: str
    new_password: str


@authRouter.post("/reset-password")
def reset_password(body: ResetPasswordBody, db: Session = Depends(get_db)):
    """Valida el token de restablecimiento, actualiza la contraseña y limpia el token."""
    user = db.query(models.Registro).filter(models.Registro.verification_token == body.token).first()
    if not user:
        raise HTTPException(status_code=404, detail="Token inválido")
    if not user.token_expires_at or user.token_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="El token ha expirado. Solicita uno nuevo.")

    # Hashear y guardar nueva contraseña
    from crud import bcrypt_context
    user.hashed_password = bcrypt_context.hash(body.new_password)
    # invalidar token
    user.verification_token = None
    user.token_expires_at = None
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "Contraseña actualizada correctamente"}


# GET helper: si el usuario abre el enlace del backend por error, redirigir al frontend
@authRouter.get("/reset-password")
def reset_password_redirect(token: str):
    frontend_base = os.getenv("FRONTEND_BASE_URL", "http://localhost:4200")
    url = f"{frontend_base.rstrip('/')}/reset-password?token={token}"
    return RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)

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
    """Devuelve solo las *clases programadas* de un profesor.

    Se excluyen los "grupos por unidad" creados desde el rol empresa,
    que se representan internamente como Clase con tema "Grupo Unidad X".
    """
    clases = crud.obtener_clases_profesor(db, profesor_username)
    clases_filtradas = [
        c for c in clases
        if not (getattr(c, "tema", "") or "").startswith("Grupo Unidad")
    ]

    respuesta: list[ClaseResponse] = []
    for clase in clases_filtradas:
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


@authRouter.get("/grupos-profesor/{profesor_username}", response_model=list[ClaseResponse])
def ver_grupos_profesor(profesor_username: str, db: Session = Depends(get_db)):
    """Devuelve los *grupos por unidad* de un profesor.

    Un grupo es una Clase cuyo tema comienza con "Grupo Unidad" y que
    se creó desde el panel de empresa para gestionar grupos de estudiantes.
    """
    clases = crud.obtener_clases_profesor(db, profesor_username)
    grupos = [
        c for c in clases
        if (getattr(c, "tema", "") or "").startswith("Grupo Unidad")
    ]

    respuesta: list[ClaseResponse] = []
    for clase in grupos:
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
    """Crea o actualiza un grupo único por (profesor, unidad) con límite de 10 estudiantes.
    Si el grupo ya existe, agrega solo estudiantes nuevos sin exceder el límite.
    """
    # Buscar grupo existente por profesor y unidad
    tema_grupo = f"Grupo Unidad {body.unidad_id}"
    grupo_existente = db.query(models.Clase).filter(
        models.Clase.profesor_username == body.profesor_username,
        models.Clase.tema == tema_grupo
    ).first()
    
    estudiantes_nuevos = body.estudiantes or []
    
    if grupo_existente:
        # Grupo ya existe - agregar solo estudiantes nuevos
        estudiantes_actuales = [est.username for est in grupo_existente.estudiantes]
        estudiantes_a_agregar = [est for est in estudiantes_nuevos if est not in estudiantes_actuales]
        
        # Validar límite de 10 estudiantes
        total_estudiantes = len(estudiantes_actuales) + len(estudiantes_a_agregar)
        if total_estudiantes > 10:
            raise HTTPException(
                status_code=400, 
                detail=f"Este grupo ya tiene {len(estudiantes_actuales)} estudiantes. "
                       f"Solo se pueden agregar {10 - len(estudiantes_actuales)} más. "
                       f"Máximo 10 estudiantes por grupo."
            )
        
        # Agregar nuevos estudiantes al grupo existente
        if estudiantes_a_agregar:
            nuevos_estudiantes_objs = db.query(models.Registro).filter(
                models.Registro.username.in_(estudiantes_a_agregar)
            ).all()
            grupo_existente.estudiantes.extend(nuevos_estudiantes_objs)
            db.commit()
            db.refresh(grupo_existente)
        
        # Preparar respuesta
        estudiantes_resp = [
            schemas.EstudianteEnClase.from_orm(est) 
            for est in grupo_existente.estudiantes
        ]
        return schemas.ClaseResponse(
            id=grupo_existente.id,
            dia=grupo_existente.dia,
            hora=grupo_existente.hora,
            tema=grupo_existente.tema,
            meet_link=grupo_existente.meet_link,
            profesor_username=grupo_existente.profesor_username,
            estudiantes=estudiantes_resp
        )
    
    else:
        # Crear nuevo grupo
        if len(estudiantes_nuevos) > 10:
            raise HTTPException(
                status_code=400,
                detail="No se pueden asignar más de 10 estudiantes a un grupo."
            )
        
        # Valores por defecto para compatibilidad con Clase
        hoy = datetime.utcnow().strftime("%Y-%m-%d")
        clase_payload = ClaseCreate(
            dia=hoy,
            hora="00:00",
            tema=tema_grupo,
            meet_link=None,
            profesor_username=body.profesor_username,
            estudiantes=estudiantes_nuevos
        )
        nueva = crud.crear_clase(db, clase_payload)
        estudiantes_resp = [
            schemas.EstudianteEnClase.from_orm(est) 
            for est in nueva.estudiantes
        ]
        return schemas.ClaseResponse(
            id=nueva.id,
            dia=nueva.dia,
            hora=nueva.hora,
            tema=nueva.tema,
            meet_link=nueva.meet_link,
            profesor_username=nueva.profesor_username,
            estudiantes=estudiantes_resp
        )

@authRouter.delete("/grupos/{grupo_id}")
def eliminar_grupo(grupo_id: int, db: Session = Depends(get_db)):
    """Elimina un grupo (clase) por su ID."""
    ok = crud.eliminar_clase(db, grupo_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Grupo no encontrado o no se pudo eliminar")
    return {"eliminado": True, "id": grupo_id}

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

# ============================
# Quizzes (profesor/empresa)
# ============================

@authRouter.post("/quizzes", response_model=QuizResponse)
def crear_quiz(body: QuizCreate, db: Session = Depends(get_db), who=Depends(require_roles(["profesor", "empresa", "admin"]))):
    q = models.Quiz(
        unidad_id=body.unidad_id,
        titulo=body.titulo,
        descripcion=body.descripcion,
        preguntas=body.preguntas or None,
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return q

@authRouter.get("/quizzes", response_model=list[QuizResponse])
def listar_quizzes(unidad_id: int | None = None, db: Session = Depends(get_db), who=Depends(require_roles(["profesor", "empresa", "admin"]))):
    query = db.query(models.Quiz)
    if unidad_id is not None:
        query = query.filter(models.Quiz.unidad_id == unidad_id)
    rows = query.order_by(models.Quiz.created_at.desc()).all()
    return rows

@authRouter.get("/quizzes/{quiz_id}/respuestas", response_model=list[QuizRespuestaResponse])
def listar_respuestas_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    who=Depends(require_roles(["profesor", "empresa", "admin"]))
):
    """Lista las respuestas de un quiz para revisión.

    - Profesores solo ven respuestas de sus estudiantes asignados.
    - Empresa/Admin ven todas las respuestas registradas.
    """
    query = db.query(models.EstudianteQuizRespuesta).filter(
        models.EstudianteQuizRespuesta.quiz_id == quiz_id
    )

    tipo_usuario = who.get("tipo_usuario")
    username = who.get("username")

    if tipo_usuario == "profesor":
        profesor = db.query(models.Registro).filter(models.Registro.username == username).first()
        if not profesor:
            raise HTTPException(status_code=404, detail="Profesor no encontrado")

        asignaciones = db.query(models.profesor_estudiante.c.estudiante_id).filter(
            models.profesor_estudiante.c.profesor_id == profesor.identificador
        ).all()
        est_ids = [row[0] for row in asignaciones]
        if not est_ids:
            return []

        estudiantes = db.query(models.Registro).filter(models.Registro.identificador.in_(est_ids)).all()
        usernames = [e.username for e in estudiantes]
        if not usernames:
            return []

        query = query.filter(models.EstudianteQuizRespuesta.estudiante_username.in_(usernames))

    rows = query.order_by(models.EstudianteQuizRespuesta.created_at.desc()).all()
    return rows

@authRouter.get("/quizzes/{quiz_id}/respuestas/{estudiante_username}", response_model=QuizRespuestaResponse)
def obtener_respuesta_quiz_estudiante(
    quiz_id: int,
    estudiante_username: str,
    db: Session = Depends(get_db),
    who=Depends(require_roles(["profesor", "empresa", "admin"]))
):
    """Devuelve el detalle de la respuesta de un estudiante para un quiz específico.

    - Profesores solo pueden ver respuestas de estudiantes que tengan asignados.
    - Empresa/Admin pueden ver cualquier respuesta.
    """
    tipo_usuario = who.get("tipo_usuario")
    username = who.get("username")

    if tipo_usuario == "profesor":
        # Reusar helper existente para verificar asignación profesor-estudiante
        if not _estudiante_asignado_a_profesor(db, username, estudiante_username):
            raise HTTPException(status_code=403, detail="Estudiante no asignado a este profesor")

    row = db.query(models.EstudianteQuizRespuesta).filter(
        models.EstudianteQuizRespuesta.quiz_id == quiz_id,
        models.EstudianteQuizRespuesta.estudiante_username == estudiante_username
    ).first()

    if not row:
        raise HTTPException(status_code=404, detail="Respuesta no encontrada")

    return row


@authRouter.post("/quizzes/{quiz_id}/estudiantes/{estudiante_username}/aprobar")
def aprobar_calificacion_quiz(
    quiz_id: int,
    estudiante_username: str,
    db: Session = Depends(get_db),
    who=Depends(require_roles(["profesor", "empresa", "admin"]))
):
    """Marca como aprobada la calificación de un estudiante para un quiz.

    - Profesores solo pueden aprobar calificaciones de estudiantes que tengan asignados.
    - Empresa/Admin pueden aprobar cualquier calificación.
    """
    now = datetime.utcnow()
    tipo_usuario = who.get("tipo_usuario")
    username = who.get("username")

    if tipo_usuario == "profesor":
        # Verificar que el estudiante esté asignado a este profesor
        if not _estudiante_asignado_a_profesor(db, username, estudiante_username):
            raise HTTPException(status_code=403, detail="Estudiante no asignado a este profesor")

    # Buscar calificación existente
    cal = db.query(models.EstudianteQuizCalificacion).filter(
        models.EstudianteQuizCalificacion.estudiante_username == estudiante_username,
        models.EstudianteQuizCalificacion.quiz_id == quiz_id,
    ).first()

    if not cal:
        raise HTTPException(status_code=404, detail="Calificación de quiz no encontrada para este estudiante")

    try:
        # Marcar como aprobada
        try:
            cal.aprobada = True
            cal.aprobada_por = username
            cal.aprobada_at = now
        except Exception:
            # Compatibilidad si las columnas aún no existen
            pass
        cal.updated_at = now
        db.add(cal)
        db.commit()
        db.refresh(cal)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo aprobar la calificación: {e}")

    return {
        "id": cal.id,
        "estudiante_username": cal.estudiante_username,
        "quiz_id": cal.quiz_id,
        "unidad_id": cal.unidad_id,
        "score": cal.score,
        "aprobada": bool(getattr(cal, "aprobada", True)),
        "aprobada_por": getattr(cal, "aprobada_por", None),
        "aprobada_at": getattr(cal, "aprobada_at", None),
        "updated_at": cal.updated_at,
    }

class QuizCalificacionManualBody(BaseModel):
    score: int
    comentario_profesor: str | None = None


@authRouter.post("/quizzes/{quiz_id}/estudiantes/{estudiante_username}/calificacion-manual")
def establecer_calificacion_manual_quiz(
    quiz_id: int,
    estudiante_username: str,
    body: QuizCalificacionManualBody,
    db: Session = Depends(get_db),
    who=Depends(require_roles(["profesor", "empresa", "admin"]))
):
    """Permite fijar una calificación manual (override) para un quiz.

    - Marca la calificación como manual, aprobada y visible para el estudiante.
    - Profesores solo pueden calificar manualmente a estudiantes que tengan asignados.
    """
    now = datetime.utcnow()
    tipo_usuario = who.get("tipo_usuario")
    username = who.get("username")

    if tipo_usuario == "profesor":
        if not _estudiante_asignado_a_profesor(db, username, estudiante_username):
            raise HTTPException(status_code=403, detail="Estudiante no asignado a este profesor")

    # Normalizar score entre 0 y 100
    try:
        new_score = int(body.score)
    except Exception:
        raise HTTPException(status_code=400, detail="La calificación debe ser un número entero")
    new_score = max(0, min(100, new_score))

    # Buscar calificación existente
    cal = db.query(models.EstudianteQuizCalificacion).filter(
        models.EstudianteQuizCalificacion.estudiante_username == estudiante_username,
        models.EstudianteQuizCalificacion.quiz_id == quiz_id,
    ).first()

    # Necesitamos unidad_id para crear una fila nueva en caso necesario
    if not cal:
        quiz = db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()
        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz no encontrado")
        unidad_id = quiz.unidad_id

        cal = models.EstudianteQuizCalificacion(
            estudiante_username=estudiante_username,
            unidad_id=unidad_id,
            quiz_id=quiz_id,
            score=new_score,
            created_at=now,
            updated_at=now,
        )
    else:
        cal.score = new_score
        cal.updated_at = now

    # Marcar como manual y aprobada
    try:
        cal.origen_manual = True
        cal.aprobada = True
        cal.aprobada_por = username
        cal.aprobada_at = now
        cal.comentario_profesor = body.comentario_profesor
    except Exception:
        # Compatibilidad si la BD aún no tiene todas las columnas
        pass

    try:
        db.add(cal)
        db.commit()
        db.refresh(cal)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo guardar la calificación manual: {e}")

    return {
        "id": cal.id,
        "estudiante_username": cal.estudiante_username,
        "quiz_id": cal.quiz_id,
        "unidad_id": cal.unidad_id,
        "score": cal.score,
        "aprobada": bool(getattr(cal, "aprobada", True)),
        "aprobada_por": getattr(cal, "aprobada_por", None),
        "aprobada_at": getattr(cal, "aprobada_at", None),
        "origen_manual": bool(getattr(cal, "origen_manual", True)),
        "comentario_profesor": getattr(cal, "comentario_profesor", None),
        "updated_at": cal.updated_at,
    }

# ============================
# Quizzes (estudiante)
# ============================

@authRouter.get("/estudiante/quizzes-disponibles", response_model=list[QuizResponse])
def quizzes_disponibles_estudiante(db: Session = Depends(get_db), who=Depends(require_roles(["estudiante", "admin"]))):
    """Lista evaluaciones disponibles para el estudiante autenticado según:
    - Existe asignación en quiz_asignacion
    - Ventana vigente (start_at <= now <= end_at) o sin límites
    - La unidad está habilitada para el estudiante (según tabla estudiante_unidad)
    - El quiz está habilitado individualmente para el estudiante (según tabla estudiante_quiz_permiso)
    """
    now = datetime.utcnow()
    user = db.query(models.Registro).filter(models.Registro.username == who["username"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Join Quiz -> QuizAsignacion -> estudiante_unidad
    quizzes = (
        db.query(models.Quiz)
        .join(models.QuizAsignacion, models.Quiz.id == models.QuizAsignacion.quiz_id)
        .join(models.estudiante_unidad, models.estudiante_unidad.c.unidad_id == models.QuizAsignacion.unidad_id)
        .filter(
            models.estudiante_unidad.c.estudiante_id == user.identificador,
            (models.QuizAsignacion.start_at.is_(None) | (models.QuizAsignacion.start_at <= now)),
            (models.QuizAsignacion.end_at.is_(None) | (models.QuizAsignacion.end_at >= now)),
        )
        .order_by(models.Quiz.created_at.desc())
        .all()
    )
    
    # Filtrar por permisos individuales de quiz
    quizzes_habilitados = []
    for quiz in quizzes:
        if crud.verificar_permiso_quiz_estudiante(db, who["username"], quiz.id):
            quizzes_habilitados.append(quiz)
    
    return quizzes_habilitados

@authRouter.get("/estudiante/mis-calificaciones-quizzes")
def obtener_calificaciones_quizzes_estudiante(db: Session = Depends(get_db), who=Depends(require_roles(["estudiante", "admin"]))):
    """Obtiene todas las calificaciones de quizzes del estudiante"""
    calificaciones = db.query(models.EstudianteQuizCalificacion).filter(
        models.EstudianteQuizCalificacion.estudiante_username == who["username"]
    ).order_by(models.EstudianteQuizCalificacion.updated_at.desc()).all()
    
    # Obtener información adicional de quizzes y unidades
    resultado = []
    for cal in calificaciones:
        quiz = db.query(models.Quiz).filter(models.Quiz.id == cal.quiz_id).first()
        unidad = db.query(models.Unidad).filter(models.Unidad.id == cal.unidad_id).first()

        aprobada = getattr(cal, "aprobada", None)
        visible_score = cal.score if aprobada else None
        aprobada_at = getattr(cal, "aprobada_at", None)
        origen_manual = getattr(cal, "origen_manual", None)
        comentario_profesor = getattr(cal, "comentario_profesor", None)
        
        resultado.append({
            "id": cal.id,
            "quiz_id": cal.quiz_id,
            "quiz_titulo": quiz.titulo if quiz else "Quiz eliminado",
            "unidad_id": cal.unidad_id,
            "unidad_nombre": unidad.nombre if unidad else "Unidad eliminada",
            "score": visible_score,
            "created_at": cal.created_at,
            "updated_at": cal.updated_at,
            "aprobada": bool(aprobada) if aprobada is not None else False,
            "aprobada_at": aprobada_at,
            "origen_manual": bool(origen_manual) if origen_manual is not None else False,
            "comentario_profesor": comentario_profesor,
        })
    
    return resultado

@authRouter.get("/estudiante/unidades/{unidad_id}/resumen-calificaciones")
def obtener_resumen_calificaciones_unidad(unidad_id: int, db: Session = Depends(get_db), who=Depends(require_roles(["estudiante", "admin"]))):
    """Obtiene el resumen completo de calificaciones para una unidad específica"""
    # Usar la función existente del sistema de calificaciones
    resumen = crud.get_unidad_grade_detalle(db, username=who["username"], unidad_id=unidad_id)
    
    # Agregar información adicional de la unidad
    unidad = db.query(models.Unidad).filter(models.Unidad.id == unidad_id).first()
    if not unidad:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")
    
    # Verificar acceso del estudiante a la unidad
    user = db.query(models.Registro).filter(models.Registro.username == who["username"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    acceso = db.query(models.estudiante_unidad).filter(
        models.estudiante_unidad.c.estudiante_id == user.identificador,
        models.estudiante_unidad.c.unidad_id == unidad_id,
        models.estudiante_unidad.c.habilitada == True
    ).first()
    
    if not acceso:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta unidad")
    
    # Agregar información de la unidad al resumen
    resumen["unidad"] = {
        "id": unidad.id,
        "nombre": unidad.nombre,
        "descripcion": getattr(unidad, "descripcion", None)
    }
    
    return resumen

@authRouter.get("/estudiante/quizzes/{quiz_id}", response_model=QuizResponse)
def obtener_quiz_estudiante(quiz_id: int, db: Session = Depends(get_db), who=Depends(require_roles(["estudiante", "admin"]))):
    now = datetime.utcnow()
    user = db.query(models.Registro).filter(models.Registro.username == who["username"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Verificar permiso individual de quiz
    if not crud.verificar_permiso_quiz_estudiante(db, who["username"], quiz_id):
        raise HTTPException(status_code=403, detail="No tienes permiso para acceder a esta evaluación")
    
    q = (
        db.query(models.Quiz)
        .join(models.QuizAsignacion, models.Quiz.id == models.QuizAsignacion.quiz_id)
        .join(models.estudiante_unidad, models.estudiante_unidad.c.unidad_id == models.QuizAsignacion.unidad_id)
        .filter(
            models.Quiz.id == quiz_id,
            models.estudiante_unidad.c.estudiante_id == user.identificador,
            (models.QuizAsignacion.start_at.is_(None) | (models.QuizAsignacion.start_at <= now)),
            (models.QuizAsignacion.end_at.is_(None) | (models.QuizAsignacion.end_at >= now)),
        )
        .first()
    )
    if not q:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta evaluación o no está disponible")
    return q

@authRouter.get("/estudiante/quizzes/{quiz_id}/detalle", response_model=QuizDetalleEstudiante)
def obtener_quiz_detalle_estudiante(quiz_id: int, db: Session = Depends(get_db), who=Depends(require_roles(["estudiante", "admin"]))):
    """Obtiene los detalles completos de un quiz para el estudiante, incluyendo si ya fue respondido"""
    now = datetime.utcnow()
    user = db.query(models.Registro).filter(models.Registro.username == who["username"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Verificar permiso individual de quiz
    if not crud.verificar_permiso_quiz_estudiante(db, who["username"], quiz_id):
        raise HTTPException(status_code=403, detail="No tienes permiso para acceder a esta evaluación")
    
    # Obtener el quiz
    q = (
        db.query(models.Quiz)
        .join(models.QuizAsignacion, models.Quiz.id == models.QuizAsignacion.quiz_id)
        .join(models.estudiante_unidad, models.estudiante_unidad.c.unidad_id == models.QuizAsignacion.unidad_id)
        .filter(
            models.Quiz.id == quiz_id,
            models.estudiante_unidad.c.estudiante_id == user.identificador,
            (models.QuizAsignacion.start_at.is_(None) | (models.QuizAsignacion.start_at <= now)),
            (models.QuizAsignacion.end_at.is_(None) | (models.QuizAsignacion.end_at >= now)),
        )
        .first()
    )
    if not q:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta evaluación o no está disponible")
    
    # Tomar la asignación principal para extraer max_intentos (si hubiera varias, usamos la más reciente)
    # Se filtra por las unidades a las que está asignado el estudiante y por la ventana de disponibilidad
    asig = (
        db.query(models.QuizAsignacion)
        .join(models.estudiante_unidad, models.estudiante_unidad.c.unidad_id == models.QuizAsignacion.unidad_id)
        .filter(
            models.QuizAsignacion.quiz_id == quiz_id,
            models.estudiante_unidad.c.estudiante_id == user.identificador,
            (models.QuizAsignacion.start_at.is_(None) | (models.QuizAsignacion.start_at <= now)),
            (models.QuizAsignacion.end_at.is_(None) | (models.QuizAsignacion.end_at >= now)),
        )
        .order_by(models.QuizAsignacion.created_at.desc())
        .first()
    )
    max_intentos = getattr(asig, "max_intentos", None) if asig else None
    tiempo_limite_minutos = getattr(asig, "tiempo_limite_minutos", None) if asig else None

    # Contar intentos de apertura realizados por el estudiante
    intentos_previos = db.query(models.EstudianteQuizIntento).filter(
        models.EstudianteQuizIntento.estudiante_username == who["username"],
        models.EstudianteQuizIntento.quiz_id == quiz_id
    ).count()

    puede_crear_nuevo_intento = (max_intentos is None or max_intentos == 0 or intentos_previos < max_intentos)
    intentos_usados = intentos_previos

    if puede_crear_nuevo_intento:
        unidad_id_intento = getattr(asig, "unidad_id", q.unidad_id)
        nuevo_intento = models.EstudianteQuizIntento(
            estudiante_username=who["username"],
            quiz_id=quiz_id,
            unidad_id=unidad_id_intento,
            intento_num=intentos_previos + 1,
            started_at=now,
        )
        db.add(nuevo_intento)
        db.commit()
        intentos_usados = intentos_previos + 1

    intentos_realizados = intentos_usados

    # Obtener la última respuesta (si existe) para fecha_respuesta
    respuesta_existente = db.query(models.EstudianteQuizRespuesta).filter(
        models.EstudianteQuizRespuesta.estudiante_username == who["username"],
        models.EstudianteQuizRespuesta.quiz_id == quiz_id
    ).order_by(models.EstudianteQuizRespuesta.created_at.desc()).first()

    # Obtener calificación si existe
    calificacion_obj = db.query(models.EstudianteQuizCalificacion).filter(
        models.EstudianteQuizCalificacion.estudiante_username == who["username"],
        models.EstudianteQuizCalificacion.quiz_id == quiz_id
    ).first()
    
    calificacion_val = None
    aprobada = None
    aprobada_at = None
    origen_manual = None
    comentario_profesor = None
    if calificacion_obj:
        try:
            aprobada = getattr(calificacion_obj, "aprobada", None)
            aprobada_at = getattr(calificacion_obj, "aprobada_at", None)
            origen_manual = getattr(calificacion_obj, "origen_manual", None)
            comentario_profesor = getattr(calificacion_obj, "comentario_profesor", None)
        except Exception:
            aprobada = None
            aprobada_at = None
            origen_manual = None
            comentario_profesor = None
        # Solo revelar la nota al estudiante cuando esté aprobada
        if aprobada:
            calificacion_val = calificacion_obj.score

    unidad_id = getattr(asig, "unidad_id", q.unidad_id)
    detalle = QuizDetalleEstudiante(
        id=q.id,
        unidad_id=unidad_id,
        titulo=q.titulo,
        descripcion=q.descripcion,
        preguntas=q.preguntas,
        ya_respondido=respuesta_existente is not None,
        calificacion=calificacion_val,
        fecha_respuesta=respuesta_existente.created_at if respuesta_existente else None,
        aprobada=bool(aprobada) if aprobada is not None else False,
        aprobada_at=aprobada_at,
        origen_manual=bool(origen_manual) if origen_manual is not None else False,
        comentario_profesor=comentario_profesor,
    )

    # Adjuntar metadatos de intentos en el dict de salida (Pydantic permite atributos extra vía response_model)
    data = detalle.dict()
    data["intentos_realizados"] = intentos_realizados
    data["max_intentos"] = max_intentos
    data["puede_intentar"] = (max_intentos is None or max_intentos == 0 or puede_crear_nuevo_intento)
    data["tiempo_limite_minutos"] = tiempo_limite_minutos
    data["aprobada"] = detalle.aprobada
    data["aprobada_at"] = detalle.aprobada_at
    data["origen_manual"] = detalle.origen_manual
    data["comentario_profesor"] = detalle.comentario_profesor
    return data

@authRouter.post("/estudiante/quizzes/{quiz_id}/responder", response_model=QuizRespuestaResponse)
def responder_quiz(quiz_id: int, body: QuizRespuestaCreate, db: Session = Depends(get_db), who=Depends(require_roles(["estudiante", "admin"]))):
    """Permite al estudiante enviar sus respuestas a un quiz"""
    now = datetime.utcnow()
    user = db.query(models.Registro).filter(models.Registro.username == who["username"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Verificar que el quiz_id coincida
    if body.quiz_id != quiz_id:
        raise HTTPException(status_code=400, detail="El ID del quiz no coincide")
    
    # Verificar permiso individual de quiz
    if not crud.verificar_permiso_quiz_estudiante(db, who["username"], quiz_id):
        raise HTTPException(status_code=403, detail="No tienes permiso para responder esta evaluación")
    
    # Verificar que el quiz existe y está disponible
    q = (
        db.query(models.Quiz)
        .join(models.QuizAsignacion, models.Quiz.id == models.QuizAsignacion.quiz_id)
        .join(models.estudiante_unidad, models.estudiante_unidad.c.unidad_id == models.QuizAsignacion.unidad_id)
        .filter(
            models.Quiz.id == quiz_id,
            models.estudiante_unidad.c.estudiante_id == user.identificador,
            (models.QuizAsignacion.start_at.is_(None) | (models.QuizAsignacion.start_at <= now)),
            (models.QuizAsignacion.end_at.is_(None) | (models.QuizAsignacion.end_at >= now)),
        )
        .first()
    )
    if not q:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta evaluación o no está disponible")
    
    # Verificar cantidad de intentos permitidos para esta asignación
    asig = (
        db.query(models.QuizAsignacion)
        .filter(models.QuizAsignacion.quiz_id == quiz_id, models.QuizAsignacion.unidad_id == q.unidad_id)
        .order_by(models.QuizAsignacion.created_at.desc())
        .first()
    )
    max_intentos = getattr(asig, "max_intentos", None) if asig else None

    # Contar intentos ya consumidos (aperturas)
    intentos_usados = db.query(models.EstudianteQuizIntento).filter(
        models.EstudianteQuizIntento.estudiante_username == who["username"],
        models.EstudianteQuizIntento.quiz_id == quiz_id
    ).count()

    if intentos_usados == 0:
        unidad_id_intento = getattr(asig, "unidad_id", q.unidad_id)
        nuevo_intento = models.EstudianteQuizIntento(
            estudiante_username=who["username"],
            quiz_id=quiz_id,
            unidad_id=unidad_id_intento,
            intento_num=1,
            started_at=now,
        )
        db.add(nuevo_intento)
        intentos_usados = 1

    if max_intentos is not None and max_intentos != 0 and intentos_usados > max_intentos:
        raise HTTPException(status_code=400, detail="Has alcanzado el número máximo de intentos para esta evaluación")
    
    try:
        # Calcular puntaje (por ahora simple, se puede mejorar)
        score = calcular_puntaje_quiz(q.preguntas, body.respuestas)
        
        # Crear respuesta
        nueva_respuesta = models.EstudianteQuizRespuesta(
            estudiante_username=who["username"],
            quiz_id=quiz_id,
            unidad_id=q.unidad_id,
            respuestas=body.respuestas,
            score=score
        )
        db.add(nueva_respuesta)
        
        db.commit()
        db.refresh(nueva_respuesta)
        
        # Usar la función existente para actualizar calificaciones, guardando la mejor nota alcanzada
        try:
            # Obtener calificación previa, si existe
            cal_prev = db.query(models.EstudianteQuizCalificacion).filter(
                models.EstudianteQuizCalificacion.estudiante_username == who["username"],
                models.EstudianteQuizCalificacion.unidad_id == q.unidad_id,
                models.EstudianteQuizCalificacion.quiz_id == quiz_id
            ).first()

            best_score = score
            if cal_prev and cal_prev.score is not None:
                best_score = max(best_score, int(cal_prev.score))

            crud.upsert_quiz_calificacion(
                db,
                estudiante_username=who["username"],
                unidad_id=q.unidad_id,
                quiz_id=quiz_id,
                score=best_score
            )
        except Exception as e:
            print(f"[WARN] Error actualizando calificación de quiz con mejor nota: {e}")
        
        # Crear notificación de evaluación completada
        try:
            user_record = db.query(models.Registro).filter(models.Registro.username == who["username"]).first()
            if user_record:
                mensaje = f"Has completado la evaluación '{q.titulo}' con una calificación de {score}/100."
                crud.crear_notificacion(
                    db,
                    usuario_id=int(user_record.identificador),
                    tipo="quiz_completado",
                    mensaje=mensaje,
                    unidad_id=q.unidad_id,
                )
        except Exception as e:
            print(f"[WARN] Error creando notificación de quiz completado: {e}")
        
        return QuizRespuestaResponse(
            id=nueva_respuesta.id,
            estudiante_username=nueva_respuesta.estudiante_username,
            quiz_id=nueva_respuesta.quiz_id,
            unidad_id=nueva_respuesta.unidad_id,
            respuestas=nueva_respuesta.respuestas,
            score=nueva_respuesta.score,
            created_at=nueva_respuesta.created_at,
            updated_at=nueva_respuesta.updated_at
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al guardar respuestas: {str(e)}")

def calcular_puntaje_quiz(preguntas: dict, respuestas: dict) -> int:
    """Función auxiliar para calcular el puntaje de un quiz.

    Soporta estructuras donde:
      - Las preguntas vienen en `{"preguntas": [...]}` o `{"items": [...]}`
      - En preguntas de opción múltiple, la opción correcta se marca con `correcta: true`
      - El frontend envía como respuesta el **índice** de la opción seleccionada
    """
    print("🧮 DEBUG: calcular_puntaje_quiz iniciado")
    print(f"🧮 DEBUG: preguntas recibidas: {preguntas}")
    print(f"🧮 DEBUG: respuestas recibidas: {respuestas}")

    if not preguntas or not respuestas:
        print(f"❌ DEBUG: Datos vacíos - preguntas: {bool(preguntas)}, respuestas: {bool(respuestas)}")
        return 0

    # Normalizar estructura de preguntas
    preguntas_lista: list = []
    if isinstance(preguntas, dict):
        if "preguntas" in preguntas:
            preguntas_lista = preguntas.get("preguntas", [])
        elif "items" in preguntas:
            preguntas_lista = preguntas.get("items", [])
        else:
            preguntas_lista = list(preguntas.values()) if preguntas else []
    elif isinstance(preguntas, list):
        preguntas_lista = preguntas

    print(f"🧮 DEBUG: preguntas_lista extraída: {preguntas_lista}")

    total_preguntas = len(preguntas_lista)
    if total_preguntas == 0:
        print("❌ DEBUG: No hay preguntas en la lista")
        return 0

    print(f"🧮 DEBUG: Total de preguntas: {total_preguntas}")

    respuestas_correctas = 0
    total_evaluables = 0  # preguntas que realmente cuentan para el puntaje

    for i, pregunta in enumerate(preguntas_lista):
        pregunta_key = f"pregunta_{i}"
        respuesta_estudiante = respuestas.get(pregunta_key)

        # Ignorar explícitamente preguntas de respuesta corta en el cálculo automático
        if isinstance(pregunta, dict) and pregunta.get("tipo") == "respuesta_corta":
            print(f"🧮 DEBUG: Pregunta {i} es de tipo 'respuesta_corta' → se ignora en el puntaje automático")
            continue

        respuesta_correcta = None
        if isinstance(pregunta, dict):
            # 1) Si viene un campo directo (compatibilidad hacia adelante)
            #    Soporta: respuesta_correcta, correct_answer, answer, respuesta, correcta
            #    IMPORTANTE: no usar cadena de "or" para no descartar valores falsy válidos (False, 0, "")
            for key in ("respuesta_correcta", "correct_answer", "answer", "respuesta", "correcta"):
                if key in pregunta:
                    respuesta_correcta = pregunta.get(key)
                    break
            # 2) Caso actual: opción múltiple con flag `correcta` en la lista de opciones
            if respuesta_correcta is None and "opciones" in pregunta and isinstance(pregunta["opciones"], list):
                for idx, op in enumerate(pregunta["opciones"]):
                    try:
                        if isinstance(op, dict) and op.get("correcta") is True:
                            respuesta_correcta = idx  # usamos el índice como respuesta correcta
                            break
                    except Exception:
                        continue

        print(f"🧮 DEBUG: Pregunta {i}:")
        print(f"  - Estructura: {pregunta}")
        print(f"  - Respuesta estudiante ({pregunta_key}): {respuesta_estudiante}")
        print(f"  - Respuesta correcta (normalizada): {respuesta_correcta}")

        es_correcta = False

        # Solo contamos la pregunta si hay respuesta correcta definida
        # y el estudiante envió algo para esa pregunta.
        if respuesta_correcta is not None and respuesta_estudiante is not None:
            total_evaluables += 1

            # Comparación flexible: primero como string
            try:
                resp_est_str = str(respuesta_estudiante).strip().lower()
                resp_cor_str = str(respuesta_correcta).strip().lower()
                es_correcta = resp_est_str == resp_cor_str
            except Exception:
                es_correcta = False

            # Si no coincidió por string, intentar comparación directa
            if not es_correcta:
                es_correcta = respuesta_estudiante == respuesta_correcta

        print(f"  - ¿Es correcta?: {es_correcta}")

        if es_correcta:
            respuestas_correctas += 1

    # Si por alguna razón no hay preguntas evaluables (p.ej. solo tipos aún no soportados)
    # devolvemos 0 para evitar división por cero.
    if total_evaluables == 0:
        print("❌ DEBUG: No hay preguntas evaluables (todas ignoradas temporalmente)")
        return 0

    puntaje = int((respuestas_correctas / total_evaluables) * 100)

    print("🧮 DEBUG: Resultado final:")
    print(f"  - Respuestas correctas: {respuestas_correctas}/{total_evaluables}")
    print(f"  - Puntaje calculado: {puntaje}/100")

    return puntaje

@authRouter.get("/quizzes/{quiz_id}", response_model=QuizResponse)
def obtener_quiz(quiz_id: int, db: Session = Depends(get_db), who=Depends(require_roles(["profesor", "empresa", "admin"]))):
    q = db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Quiz no encontrado")
    return q

@authRouter.post("/admin/create-tables")
def create_tables_endpoint(db: Session = Depends(get_db)):
    """Endpoint temporal para crear las tablas necesarias"""
    try:
        from Clever_MySQL_conn import Base, engine
        Base.metadata.create_all(bind=engine)
        return {"message": "Tablas creadas exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear tablas: {str(e)}")

@authRouter.put("/quizzes/{quiz_id}", response_model=QuizResponse)
def actualizar_quiz(quiz_id: int, body: QuizCreate, db: Session = Depends(get_db), who=Depends(require_roles(["profesor", "empresa", "admin"]))):
    q = db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Quiz no encontrado")
    q.unidad_id = body.unidad_id
    q.titulo = body.titulo
    q.descripcion = body.descripcion
    q.preguntas = body.preguntas or None
    db.add(q)
    db.commit()
    db.refresh(q)
    return q

@authRouter.delete("/quizzes/{quiz_id}")
def eliminar_quiz(quiz_id: int, db: Session = Depends(get_db), who=Depends(require_roles(["profesor", "empresa", "admin"]))):
    q = db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Quiz no encontrado")
    
    try:
        # Eliminar usando delete() en masa para mejor rendimiento
        print(f"Eliminando asignaciones para quiz_id: {quiz_id}")
        db.query(models.QuizAsignacion).filter(models.QuizAsignacion.quiz_id == quiz_id).delete()
        
        print(f"Eliminando calificaciones para quiz_id: {quiz_id}")
        db.query(models.EstudianteQuizCalificacion).filter(models.EstudianteQuizCalificacion.quiz_id == quiz_id).delete()
        
        print(f"Eliminando permisos para quiz_id: {quiz_id}")
        db.query(models.EstudianteQuizPermiso).filter(models.EstudianteQuizPermiso.quiz_id == quiz_id).delete()
        
        print(f"Eliminando quiz con id: {quiz_id}")
        # Finalmente eliminar el quiz
        db.delete(q)
        
        print("Haciendo commit...")
        db.commit()
        print("Quiz eliminado exitosamente")
        return {"eliminado": True, "id": quiz_id}
    except Exception as e:
        print(f"Error al eliminar quiz: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo eliminar el quiz: {str(e)}")

# ===== Asignaciones =====
@authRouter.post("/quizzes/{quiz_id}/assignments", response_model=QuizAsignacionResponse)
def crear_asignacion(quiz_id: int, body: QuizAsignacionCreate, db: Session = Depends(get_db), who=Depends(require_roles(["profesor", "empresa", "admin"]))):
    q = db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Quiz no encontrado")
    asig = models.QuizAsignacion(
        quiz_id=quiz_id,
        unidad_id=body.unidad_id,
        start_at=body.start_at,
        end_at=body.end_at,
        max_intentos=body.max_intentos,
        tiempo_limite_minutos=body.tiempo_limite_minutos
    )
    db.add(asig)
    db.commit()
    db.refresh(asig)
    return asig

@authRouter.get("/quizzes/{quiz_id}/assignments", response_model=list[QuizAsignacionResponse])
def listar_asignaciones(quiz_id: int, db: Session = Depends(get_db), who=Depends(require_roles(["profesor", "empresa", "admin"]))):
    rows = db.query(models.QuizAsignacion).filter(models.QuizAsignacion.quiz_id == quiz_id).order_by(models.QuizAsignacion.created_at.desc()).all()
    return rows

@authRouter.delete("/quizzes/{quiz_id}/assignments/{asig_id}")
def eliminar_asignacion(quiz_id: int, asig_id: int, db: Session = Depends(get_db), who=Depends(require_roles(["profesor", "empresa", "admin"]))):
    row = db.query(models.QuizAsignacion).filter(models.QuizAsignacion.id == asig_id, models.QuizAsignacion.quiz_id == quiz_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    db.delete(row)
    db.commit()
    return {"eliminada": True, "id": asig_id}

# ===== Permisos de Quiz por Estudiante =====
@authRouter.post("/estudiante/{username}/quiz/{quiz_id}/toggle-permiso")
def toggle_permiso_quiz_estudiante(
    username: str, 
    quiz_id: int, 
    db: Session = Depends(get_db), 
    who=Depends(require_roles(["profesor", "empresa", "admin"]))
):
    """Habilita o deshabilita un quiz específico para un estudiante.
    Por defecto todos los quizzes están habilitados. Al hacer toggle por primera vez, se deshabilita.
    """
    resultado = crud.toggle_quiz_permiso_estudiante(db, username, quiz_id)
    if resultado is None:
        raise HTTPException(status_code=404, detail="Estudiante o quiz no encontrado")
    return {
        "estudiante_username": username,
        "quiz_id": quiz_id,
        "habilitado": resultado["habilitado"],
        "mensaje": f"Quiz {'habilitado' if resultado['habilitado'] else 'deshabilitado'} para el estudiante"
    }

@authRouter.get("/estudiante/{username}/quizzes-permisos")
def listar_permisos_quiz_estudiante(
    username: str,
    db: Session = Depends(get_db),
    who=Depends(require_roles(["profesor", "empresa", "admin"]))
):
    """Lista todos los permisos de quiz configurados para un estudiante.
    Solo muestra los permisos explícitamente configurados (deshabilitados).
    Los quizzes sin registro están habilitados por defecto.
    """
    permisos = crud.obtener_permisos_quiz_estudiante(db, username)
    return [{
        "quiz_id": p.quiz_id,
        "habilitado": p.habilitado,
        "created_at": p.created_at,
        "updated_at": p.updated_at
    } for p in permisos]

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
    # Excluir grupos de unidad (tema "Grupo Unidad X") para que el estudiante
    # solo vea clases reales en su calendario.
    clases_filtradas = [
        c for c in clases
        if not (getattr(c, "tema", "") or "").startswith("Grupo Unidad")
    ]

    respuesta = []
    for clase in clases_filtradas:
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

# Alias plural para compatibilidad con clientes que consultan /profesores/
@authRouter.get("/profesores/", response_model=List[schemas.UsuarioResponse])
def obtener_profesores_plural(db: Session = Depends(get_db)):
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
def obtener_unidades(db: Session = Depends(get_db), who=Depends(require_roles(["admin", "empresa", "profesor"]))):
    """Obtiene todas las unidades disponibles"""
    res = crud.obtener_unidades(db)
    try:
        print(f"[API] GET /unidades -> {len(res)} items (by {who})")
    except Exception:
        pass
    return res

# ============ Listados de calificaciones por estudiante ==========
@authRouter.get("/grades/estudiantes/{username}/tareas", response_model=List[dict])
def listar_tareas_calificaciones(username: str, db: Session = Depends(get_db), who=Depends(require_roles(["profesor", "empresa", "admin"]))):
    rows = db.query(models.TareaCalificacion).filter(models.TareaCalificacion.estudiante_username == username).order_by(models.TareaCalificacion.updated_at.desc()).all()
    # nombre de unidad
    unidades = {u.id: u.nombre for u in db.query(models.Unidad.id, models.Unidad.nombre).all()}
    return [
        {
            "id": r.id,
            "unidad_id": r.unidad_id,
            "unidad_nombre": unidades.get(r.unidad_id),
            "filename": r.filename,
            "score": r.score,
            "updated_at": getattr(r, 'updated_at', None)
        }
        for r in rows
    ]

@authRouter.get("/grades/estudiantes/{username}/quizzes", response_model=List[dict])
def listar_quizzes_calificaciones(username: str, db: Session = Depends(get_db), who=Depends(require_roles(["profesor", "empresa", "admin"]))):
    rows = db.query(models.EstudianteQuizCalificacion).filter(models.EstudianteQuizCalificacion.estudiante_username == username).order_by(models.EstudianteQuizCalificacion.updated_at.desc()).all()
    unidades = {u.id: u.nombre for u in db.query(models.Unidad.id, models.Unidad.nombre).all()}
    quizzes = {q.id: q.titulo for q in db.query(models.Quiz.id, models.Quiz.titulo).all()} if hasattr(models, 'Quiz') else {}
    return [
        {
            "id": r.id,
            "unidad_id": r.unidad_id,
            "unidad_nombre": unidades.get(r.unidad_id),
            "quiz_id": r.quiz_id,
            "quiz_titulo": quizzes.get(r.quiz_id),
            "score": r.score,
            "updated_at": getattr(r, 'updated_at', None)
        }
        for r in rows
    ]

@authRouter.get("/grades/estudiantes/{username}/unidades/finales", response_model=List[dict])
def listar_unidades_finales(username: str, db: Session = Depends(get_db), who=Depends(require_roles(["profesor", "empresa", "admin"]))):
    rows = db.query(models.UnidadCalificacionFinal).filter(models.UnidadCalificacionFinal.estudiante_username == username).order_by(models.UnidadCalificacionFinal.updated_at.desc()).all()
    unidades = {u.id: u.nombre for u in db.query(models.Unidad.id, models.Unidad.nombre).all()}
    return [
        {
            "id": r.id,
            "unidad_id": r.unidad_id,
            "unidad_nombre": unidades.get(r.unidad_id),
            "score": r.score,
            "aprobado": r.aprobado,
            "updated_at": getattr(r, 'updated_at', None)
        }
        for r in rows
    ]

@authRouter.post("/unidades/", response_model=dict)
def crear_unidad(body: dict = Body(...), db: Session = Depends(get_db), who=Depends(require_roles(["admin", "empresa"]))):
    """Crea una unidad sin afectar las existentes (no destructivo)."""
    try:
        print(f"[API] POST /unidades by={who} body={body}")
    except Exception:
        pass
    res = crud.crear_unidad(db, body)
    try:
        print(f"[API] POST /unidades -> created id={res.get('id')}")
    except Exception:
        pass
    return res

@authRouter.put("/unidades/{unidad_id}", response_model=dict)
def actualizar_unidad(unidad_id: int, body: dict = Body(...), db: Session = Depends(get_db), who=Depends(require_roles(["admin", "empresa"]))):
    """Actualiza una unidad existente (nombre, descripcion, orden)."""
    res = crud.actualizar_unidad(db, unidad_id, body)
    if not res:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")
    return res

@authRouter.delete("/unidades/{unidad_id}")
def eliminar_unidad(unidad_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Elimina una unidad. Solo admin. Limpia relaciones pivot."""
    ok = crud.eliminar_unidad(db, unidad_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")
    return {"eliminada": True, "id": unidad_id}

# ===== Subcarpetas =====
@authRouter.get("/unidades/{unidad_id}/subcarpetas", response_model=List[dict])
def listar_subcarpetas(unidad_id: int, db: Session = Depends(get_db), who=Depends(require_roles(["admin", "empresa", "profesor", "estudiante"]))):
    """Lista subcarpetas de una unidad. Para estudiantes, solo devuelve las habilitadas."""
    subs = crud.listar_subcarpetas(db, unidad_id)
    try:
        rol = who.get("tipo_usuario") if isinstance(who, dict) else None
    except Exception:
        rol = None
    if rol == "estudiante":
        subs = [s for s in subs if s.get("habilitada", True)]
    return subs

@authRouter.post("/unidades/{unidad_id}/subcarpetas", response_model=dict)
def crear_subcarpeta(unidad_id: int, body: dict = Body(...), db: Session = Depends(get_db), who=Depends(require_roles(["admin", "empresa"]))):
    """Crea una subcarpeta en la unidad indicada"""
    return crud.crear_subcarpeta(db, unidad_id, body)

@authRouter.put("/unidades/{unidad_id}/subcarpetas/{subcarpeta_id}", response_model=dict)
def actualizar_subcarpeta(unidad_id: int, subcarpeta_id: int, body: dict = Body(...), db: Session = Depends(get_db), who=Depends(require_roles(["admin", "empresa"]))):
    """Actualiza una subcarpeta existente (nombre, descripcion, orden)"""
    # Verificar que la subcarpeta pertenece a la unidad
    subcarpeta = db.query(models.Subcarpeta).filter(
        models.Subcarpeta.id == subcarpeta_id,
        models.Subcarpeta.unidad_id == unidad_id
    ).first()
    if not subcarpeta:
        raise HTTPException(status_code=404, detail="Subcarpeta no encontrada")
    return crud.actualizar_subcarpeta(db, subcarpeta_id, body)

@authRouter.delete("/unidades/{unidad_id}/subcarpetas/{subcarpeta_id}")
def eliminar_subcarpeta(unidad_id: int, subcarpeta_id: int, db: Session = Depends(get_db), who=Depends(require_roles(["admin", "empresa"]))):
    """Elimina una subcarpeta"""
    # Verificar que la subcarpeta pertenece a la unidad
    subcarpeta = db.query(models.Subcarpeta).filter(
        models.Subcarpeta.id == subcarpeta_id,
        models.Subcarpeta.unidad_id == unidad_id
    ).first()
    if not subcarpeta:
        raise HTTPException(status_code=404, detail="Subcarpeta no encontrada")
    ok = crud.eliminar_subcarpeta(db, subcarpeta_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Error eliminando subcarpeta")
    return {"eliminada": True, "id": subcarpeta_id}

@authRouter.put("/unidades/{unidad_id}/subcarpetas/{subcarpeta_id}/toggle", response_model=dict)
def toggle_subcarpeta(unidad_id: int, subcarpeta_id: int, db: Session = Depends(get_db), who=Depends(require_roles(["admin", "empresa"]))):
    """Oculta o muestra una subcarpeta (cambia el estado habilitada)"""
    # Verificar que la subcarpeta pertenece a la unidad
    subcarpeta = db.query(models.Subcarpeta).filter(
        models.Subcarpeta.id == subcarpeta_id,
        models.Subcarpeta.unidad_id == unidad_id
    ).first()
    if not subcarpeta:
        raise HTTPException(status_code=404, detail="Subcarpeta no encontrada")
    resultado = crud.toggle_subcarpeta(db, subcarpeta_id)
    if resultado is None:
        raise HTTPException(status_code=404, detail="Subcarpeta no encontrada")
    return {"habilitada": resultado}

# ===== Notificaciones =====
@authRouter.get("/notificaciones/usuario/{usuario_id}")
def listar_notificaciones_usuario(usuario_id: int, db: Session = Depends(get_db), who=Depends(require_roles(["admin", "empresa", "profesor", "estudiante"]))):
    """Lista notificaciones del usuario destinatario"""
    return crud.listar_notificaciones_usuario(db, usuario_id)

@authRouter.post("/notificaciones", response_model=dict)
def crear_notificacion(body: dict = Body(...), db: Session = Depends(get_db), who=Depends(require_roles(["admin", "empresa", "profesor"]))):
    """Crea una notificación dirigida a un usuario (solo admin/empresa/profesor)."""
    usuario_id = int(body.get("usuario_id"))
    tipo = (body.get("tipo") or "").strip() or "info"
    mensaje = (body.get("mensaje") or "").strip()
    if not mensaje:
        raise HTTPException(status_code=400, detail="El mensaje es requerido")
    usuario_remitente_id = body.get("usuario_remitente_id")
    unidad_id = body.get("unidad_id")
    return crud.crear_notificacion(
        db,
        usuario_id=usuario_id,
        tipo=tipo,
        mensaje=mensaje,
        usuario_remitente_id=usuario_remitente_id,
        unidad_id=unidad_id,
    )

@authRouter.put("/notificaciones/{notificacion_id}/marcar-leida", response_model=dict)
def marcar_notificacion_leida(notificacion_id: int, db: Session = Depends(get_db), who=Depends(require_roles(["admin", "empresa", "profesor", "estudiante"]))):
    res = crud.marcar_notificacion_leida(db, notificacion_id)
    if not res:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    return res

@authRouter.put("/notificaciones/usuario/{usuario_id}/marcar-todas-leidas", response_model=dict)
def marcar_todas_leidas(
    usuario_id: int, 
    db: Session = Depends(get_db), 
    who=Depends(require_roles(["admin", "empresa", "profesor", "estudiante"]))
):
    """Marcar todas las notificaciones como leídas para un usuario específico"""
    
    # Obtener información del usuario autenticado
    username_autenticado = who.get("username")
    tipo_usuario = who.get("tipo_usuario")
    
    print(f"🔔 DEBUG: marcar_todas_leidas - usuario_id={usuario_id}, auth_user={username_autenticado}, tipo={tipo_usuario}")
    
    # Validar permisos: solo admins pueden modificar notificaciones de otros usuarios
    if tipo_usuario != "admin":
        # Obtener el usuario autenticado desde la BD
        usuario_autenticado = db.query(models.Registro).filter(
            models.Registro.username == username_autenticado
        ).first()
        
        if not usuario_autenticado:
            print(f"❌ DEBUG: Usuario autenticado no encontrado: {username_autenticado}")
            raise HTTPException(status_code=404, detail="Usuario autenticado no encontrado")
        
        # Verificar que el usuario_id coincida con el usuario autenticado
        if usuario_autenticado.identificador != usuario_id:
            print(f"❌ DEBUG: Intento de modificar notificaciones ajenas - auth_id={usuario_autenticado.identificador}, target_id={usuario_id}")
            raise HTTPException(
                status_code=403, 
                detail="Solo puedes modificar tus propias notificaciones"
            )
    
    # Proceder con la actualización
    try:
        count = crud.marcar_todas_notificaciones_leidas(db, usuario_id)
        print(f"✅ DEBUG: Marcadas {count} notificaciones como leídas para usuario_id={usuario_id}")
        return {"actualizadas": count}
    except Exception as e:
        print(f"❌ DEBUG: Error marcando notificaciones: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

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

# ===== Calificaciones (Upserts y Resumen por unidad) =====
class UpsertTareaBody(BaseModel):
    estudiante_username: str
    unidad_id: int
    filename: str
    score: int

@authRouter.post("/grades/tareas")
def upsert_tarea(body: UpsertTareaBody, db: Session = Depends(get_db), who=Depends(require_roles(["profesor", "empresa", "admin"]))):
    row = crud.upsert_tarea_calificacion(
        db,
        estudiante_username=body.estudiante_username,
        unidad_id=body.unidad_id,
        filename=body.filename,
        score=body.score,
    )
    try:
        est = db.query(models.Registro).filter(models.Registro.username == body.estudiante_username).first()
        remitente = db.query(models.Registro).filter(models.Registro.username == who["username"]).first()
        if est:
            msg = f"Tu tarea de la unidad {body.unidad_id} fue calificada: {body.score}/100."
            crud.crear_notificacion(
                db,
                usuario_id=int(est.identificador),
                tipo="tarea_calificada",
                mensaje=msg,
                usuario_remitente_id=int(remitente.identificador) if remitente else None,
                unidad_id=body.unidad_id,
            )
    except Exception as e:
        print(f"[WARN] Notificación tarea_calificada fallida: {e}")
    return {"id": row.id, "score": row.score}

class UpsertQuizBody(BaseModel):
    estudiante_username: str
    unidad_id: int
    quiz_id: int
    score: int

@authRouter.post("/grades/quizzes")
def upsert_quiz(body: UpsertQuizBody, db: Session = Depends(get_db)):
    row = crud.upsert_quiz_calificacion(
        db,
        estudiante_username=body.estudiante_username,
        unidad_id=body.unidad_id,
        quiz_id=body.quiz_id,
        score=body.score,
    )
    return {"id": row.id, "score": row.score}

@authRouter.get("/grades/estudiantes/{username}/unidades/{unidad_id}")
def get_unidad_grade(username: str, unidad_id: int, db: Session = Depends(get_db)):
    return crud.get_unidad_grade_detalle(db, username=username, unidad_id=unidad_id)

@authRouter.get("/unidades/{unidad_id}/quizzes", response_model=list[QuizResponse])
def listar_quizzes_unidad(unidad_id: int, db: Session = Depends(get_db)):
    quizzes = db.query(models.Quiz).filter(models.Quiz.unidad_id == unidad_id).order_by(models.Quiz.created_at.desc()).all()
    return [QuizResponse.from_orm(q) for q in quizzes]

@authRouter.delete("/unidades/quizzes/{quiz_id}")
def eliminar_quiz_unidad(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz no encontrado")
    try:
        # Eliminar usando delete() en masa para mejor rendimiento
        print(f"[UNIDAD] Eliminando asignaciones para quiz_id: {quiz_id}")
        db.query(models.QuizAsignacion).filter(models.QuizAsignacion.quiz_id == quiz_id).delete()
        
        print(f"[UNIDAD] Eliminando calificaciones para quiz_id: {quiz_id}")
        db.query(models.EstudianteQuizCalificacion).filter(models.EstudianteQuizCalificacion.quiz_id == quiz_id).delete()
        
        print(f"[UNIDAD] Eliminando permisos para quiz_id: {quiz_id}")
        db.query(models.EstudianteQuizPermiso).filter(models.EstudianteQuizPermiso.quiz_id == quiz_id).delete()
        
        print(f"[UNIDAD] Eliminando quiz con id: {quiz_id}")
        # Finalmente eliminar el quiz
        db.delete(quiz)
        
        print("[UNIDAD] Haciendo commit...")
        db.commit()
        print("[UNIDAD] Quiz eliminado exitosamente")
        return {"eliminado": True, "id": quiz_id}
    except Exception as e:
        print(f"[UNIDAD] Error al eliminar quiz: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo eliminar el quiz: {str(e)}")

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
    # Conteo de grupos creados: solo clases usadas como "grupo de unidad"
    # Se consideran grupos aquellas clases cuyo tema sigue el patrón "Grupo Unidad X"
    grupos_creados = db.query(models.Clase).filter(
        models.Clase.profesor_username == profesor_username,
        models.Clase.tema.like("Grupo Unidad%")
    ).count()
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
def obtener_todos_estudiantes(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Obtiene todos los estudiantes registrados (solo empresa/profesor)."""
    # Verificar autenticación
    current_username, tipo_usuario = _username_from_token(credentials)
    if not current_username:
        raise HTTPException(status_code=401, detail="Token inválido")

    # Solo empresa y profesor pueden ver lista de estudiantes
    if tipo_usuario not in ["empresa", "profesor"]:
        raise HTTPException(status_code=403, detail="No tienes permisos para acceder a esta información")

    try:
        # Si es profesor, solo devolver estudiantes asignados
        if tipo_usuario == "profesor":
            estudiantes = crud.obtener_estudiantes_asignados(db, current_username)
        else:
            # Si es empresa (u otro rol autorizado), devolver todos los estudiantes
            estudiantes = crud.obtener_estudiantes(db)

        return [schemas.UsuarioResponse.from_orm(est) for est in estudiantes]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo estudiantes: {e}")

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
    # Validar que la unidad exista para evitar FK
    unidad = db.query(models.Unidad).filter(models.Unidad.id == unidad_id).first()
    if not unidad:
        raise HTTPException(status_code=404, detail="Unidad no encontrada para tracking")
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
    unidad = db.query(models.Unidad).filter(models.Unidad.id == unidad_id).first()
    if not unidad:
        raise HTTPException(status_code=404, detail="Unidad no encontrada para tracking")
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
    unidad = db.query(models.Unidad).filter(models.Unidad.id == unidad_id).first()
    if not unidad:
        raise HTTPException(status_code=404, detail="Unidad no encontrada para tracking")
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
    # Registrar actividad para racha
    try:
        crud.track_activity(db, username=username, unidad_id=unidad_id, tipo_evento="progreso_update")
    except Exception as e:
        print(f"[WARN] track_activity progreso_update fallido: {e}")
    # Disparo de notificación cuando el estudiante entrega la unidad (porcentaje 100)
    try:
        if porcentaje is not None and float(porcentaje) >= 100:
            msg = f"El estudiante {username} entregó la unidad #{unidad_id}."
            created = _notify_profesores_asignados(db, estudiante_username=username, mensaje=msg, unidad_id=unidad_id, tipo="entrega_unidad")
            print(f"[NOTIFY] entrega_unidad -> profesores_notificados={created} | estudiante={username} | unidad={unidad_id}")
        else:
            print(f"[NOTIFY] entrega_unidad -> no dispara (porcentaje={porcentaje}) | estudiante={username} | unidad={unidad_id}")
    except Exception as e:
        print(f"[WARN] Notificación entrega unidad fallida: {e}")
    return {
        "unidad_id": row.unidad_id,
        "porcentaje_completado": row.porcentaje_completado,
        "score": row.score,
        "tiempo_dedicado_min": row.tiempo_dedicado_min
    }

@authRouter.get("/analytics/estudiantes/{username}/resumen")
def analytics_resumen(
    username: str, 
    desde: str | None = None, 
    hasta: str | None = None, 
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Analytics de resumen para un usuario específico (uso empresa/profesor)."""
    # Verificar autenticación
    current_username, tipo_usuario = _username_from_token(credentials)
    if not current_username:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    # Verificar permisos: solo empresa/profesor pueden ver datos de otros usuarios
    if tipo_usuario not in ['empresa', 'profesor'] and current_username != username:
        raise HTTPException(status_code=403, detail="No tienes permisos para acceder a estos datos")
    
    # Si es profesor, verificar que el estudiante esté asignado
    if tipo_usuario == 'profesor':
        if not _estudiante_asignado_a_profesor(db, current_username, username):
            raise HTTPException(status_code=403, detail="Estudiante no asignado a este profesor")
    
    try:
        from datetime import datetime
        d_from = datetime.fromisoformat(desde) if desde else None
        d_to = datetime.fromisoformat(hasta) if hasta else None
        return crud.get_analytics_resumen(db, username=username, desde=d_from, hasta=d_to)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Formato de fecha inválido: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {e}")


@authRouter.get("/analytics/estudiantes/{username}/unidades")
def analytics_unidades(
    username: str, 
    desde: str | None = None, 
    hasta: str | None = None, 
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Analytics de unidades para un usuario específico (uso empresa/profesor)."""
    # Verificar autenticación
    current_username, tipo_usuario = _username_from_token(credentials)
    if not current_username:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    # Verificar permisos: solo empresa/profesor pueden ver datos de otros usuarios
    if tipo_usuario not in ['empresa', 'profesor'] and current_username != username:
        raise HTTPException(status_code=403, detail="No tienes permisos para acceder a estos datos")
    
    # Si es profesor, verificar que el estudiante esté asignado
    if tipo_usuario == 'profesor':
        if not _estudiante_asignado_a_profesor(db, current_username, username):
            raise HTTPException(status_code=403, detail="Estudiante no asignado a este profesor")
    
    try:
        from datetime import datetime
        d_from = datetime.fromisoformat(desde) if desde else None
        d_to = datetime.fromisoformat(hasta) if hasta else None
        return crud.get_analytics_unidades(db, username=username, desde=d_from, hasta=d_to)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Formato de fecha inválido: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {e}")

@authRouter.get("/analytics/dashboard/stats")
def analytics_dashboard_stats(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Estadísticas generales del dashboard de analytics (empresa/profesor)"""
    # Verificar autenticación
    current_username, tipo_usuario = _username_from_token(credentials)
    if not current_username:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    # Solo empresa y profesor pueden acceder
    if tipo_usuario not in ['empresa', 'profesor']:
        raise HTTPException(status_code=403, detail="No tienes permisos para acceder a esta información")
    
    try:
        # Obtener estudiantes según el tipo de usuario
        if tipo_usuario == 'profesor':
            estudiantes = crud.obtener_estudiantes_asignados(db, current_username)
        else:
            estudiantes = crud.obtener_estudiantes(db)
        
        total_estudiantes = len(estudiantes)
        total_unidades = db.query(models.Unidad).count()
        
        # Calcular estadísticas agregadas
        estudiantes_activos = 0
        progreso_total = 0
        unidades_completadas_total = 0
        
        for est in estudiantes:
            resumen = crud.get_analytics_resumen(db, est.username)
            if resumen['tiempo_dedicado_min'] > 0:
                estudiantes_activos += 1
            progreso_total += resumen['progreso_general']
            unidades_completadas_total += resumen['unidades_completadas']
        
        progreso_promedio = (progreso_total / total_estudiantes) if total_estudiantes > 0 else 0
        
        return {
            "total_estudiantes": total_estudiantes,
            "estudiantes_activos": estudiantes_activos,
            "total_unidades": total_unidades,
            "progreso_promedio": round(progreso_promedio, 2),
            "unidades_completadas_total": unidades_completadas_total,
            "tipo_usuario": tipo_usuario
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo estadísticas: {e}")

@authRouter.get("/debug/actividad/{username}")
def debug_actividad_estudiante(
    username: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Debug: Ver actividades registradas de un estudiante"""
    # Verificar autenticación
    current_username, tipo_usuario = _username_from_token(credentials)
    if not current_username:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    # Solo empresa/profesor o el mismo estudiante pueden ver
    if tipo_usuario not in ['empresa', 'profesor'] and current_username != username:
        raise HTTPException(status_code=403, detail="No tienes permisos")
    
    try:
        # Obtener últimas 20 actividades
        actividades = db.query(models.ActividadEstudiante).filter(
            models.ActividadEstudiante.username == username
        ).order_by(models.ActividadEstudiante.creado_at.desc()).limit(20).all()
        
        # Obtener días únicos
        dias_unicos = sorted({a.creado_at.date() for a in actividades}, reverse=True)
        
        # Calcular racha manualmente para debug
        from datetime import datetime, timedelta
        hoy = datetime.utcnow().date()
        racha_debug = 0
        
        if dias_unicos:
            ultimo_dia = dias_unicos[0]
            diferencia = (hoy - ultimo_dia).days
            
            if diferencia <= 1:
                cursor = ultimo_dia
                for dia in dias_unicos:
                    if dia == cursor:
                        racha_debug += 1
                        cursor = cursor - timedelta(days=1)
                    elif (cursor - dia).days == 1:
                        racha_debug += 1
                        cursor = dia - timedelta(days=1)
                    else:
                        break
        
        return {
            "username": username,
            "total_actividades": len(actividades),
            "dias_unicos_actividad": len(dias_unicos),
            "ultimo_dia_actividad": str(dias_unicos[0]) if dias_unicos else None,
            "dias_desde_ultima_actividad": (hoy - dias_unicos[0]).days if dias_unicos else None,
            "racha_calculada": racha_debug,
            "actividades_recientes": [
                {
                    "fecha": a.creado_at.isoformat(),
                    "tipo": a.tipo_evento,
                    "unidad_id": a.unidad_id,
                    "duracion_min": a.duracion_min
                } for a in actividades[:10]
            ],
            "dias_unicos_str": [str(d) for d in dias_unicos[:10]]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en debug: {e}")

@authRouter.post("/debug/registrar-actividad")
def debug_registrar_actividad(
    unidad_id: int = Body(..., embed=True),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Debug: Registrar actividad manualmente para testing"""
    username, _ = _username_from_token(credentials)
    if not username:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    try:
        # Registrar actividad de estudio
        result = crud.track_activity(
            db, 
            username=username, 
            unidad_id=unidad_id, 
            tipo_evento="estudio_manual", 
            duracion_min=5
        )
        
        # Obtener racha actualizada
        resumen = crud.get_analytics_resumen(db, username)
        
        return {
            "mensaje": "Actividad registrada exitosamente",
            "username": username,
            "unidad_id": unidad_id,
            "racha_actual": resumen['racha_dias'],
            "progreso_general": resumen['progreso_general'],
            "tiempo_total": resumen['tiempo_dedicado_min']
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error registrando actividad: {e}")

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
            # No bloquear: permitir subida en SOLO TAREAS aunque no exista relación habilitada
            # dejando un log para diagnóstico. Esto evita errores cuando la unidad no está
            # registrada en BD pero existe en el filesystem de tareas.
            try:
                relaciones = db.query(models.estudiante_unidad).filter(
                    models.estudiante_unidad.c.estudiante_id == estudiante.identificador
                ).all()
                print(f"⚠️ WARN: Subiendo sin relación habilitada. estudiante_id={estudiante.identificador}, unidad_id={unidad_id}, relaciones={relaciones}")
            except Exception as e:
                print(f"⚠️ DEBUG: No se pudo listar relaciones estudiante_unidad: {e}")
    
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

            # Guardar metadata en BD via CRUD
            uploaded_files.append({
                "filename": safe_filename,
                "original_filename": file.filename,
                "file_size": file_path.stat().st_size,
            })
            print(f"✅ DEBUG: Archivo guardado: {safe_filename}")
            # Metadata se maneja ahora en el sistema de calificaciones V2
            # No necesitamos archivos .meta.json adicionales
            print(f"✅ DEBUG: Archivo guardado sin metadata JSON: {safe_filename}")
            
        except Exception as e:
            print(f"❌ DEBUG: Error guardando {file.filename}: {e}")
            if file_path.exists():
                file_path.unlink()
    
    # Notificar a profesores asignados si hubo subidas
    notifications_created = 0
    try:
        if uploaded_files:
            msg = f"El estudiante {current_user} subió {len(uploaded_files)} archivo(s) en SOLO TAREAS de la unidad #{unidad_id}."
            notifications_created = _notify_profesores_asignados(db, estudiante_username=current_user, mensaje=msg, unidad_id=unidad_id, tipo="subida_tarea")
            print(f"[NOTIFY] subida_tarea -> profesores_notificados={notifications_created} | estudiante={current_user} | unidad={unidad_id}")
            # Registrar actividad para racha por entrega de tarea
            try:
                crud.track_activity(db, username=current_user, unidad_id=unidad_id, tipo_evento="entrega_tarea")
            except Exception as e:
                print(f"[WARN] track_activity entrega_tarea fallido: {e}")
        else:
            print(f"[NOTIFY] subida_tarea -> no dispara (uploaded_files=0) | estudiante={current_user} | unidad={unidad_id}")
    except Exception as e:
        print(f"[WARN] Notificación subida tareas fallida: {e}")

    return {
        "message": f"Archivos subidos exitosamente: {len(uploaded_files)}",
        "uploaded_files": uploaded_files,
        "unidad_id": unidad_id,
        "subcarpeta": subcarpeta_nombre,
        "uploaded_by": current_user,
        "upload_date": datetime.now().isoformat(),
        "notifications_created": notifications_created
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

@authRouter.delete("/estudiantes/subcarpetas/{unidad_id}/{subcarpeta_nombre}/files/{filename}")
def delete_student_file(
    unidad_id: int,
    subcarpeta_nombre: str,
    filename: str,
    current_user: str = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Endpoint para que estudiantes eliminen sus propias tareas"""
    
    # RESTRICCIÓN: Solo subcarpeta "SOLO TAREAS"
    if subcarpeta_nombre != "SOLO TAREAS":
        raise HTTPException(
            status_code=403, 
            detail="Los estudiantes solo pueden eliminar archivos de 'SOLO TAREAS'"
        )
    
    # Verificar acceso del estudiante a la unidad
    print(f"🗑️ DEBUG: Eliminando archivo - user={current_user}, unidad_id={unidad_id}, filename={filename}")
    
    # Obtener el ID del estudiante
    estudiante = db.query(models.Registro).filter(models.Registro.username == current_user).first()
    if not estudiante:
        print(f"❌ DEBUG: Usuario {current_user} no encontrado")
        raise HTTPException(status_code=403, detail="Usuario no encontrado")
    
    # Verificar relación en tabla estudiante_unidad (con auto-reparación)
    acceso = db.query(models.estudiante_unidad).filter(
        models.estudiante_unidad.c.estudiante_id == estudiante.identificador,
        models.estudiante_unidad.c.unidad_id == unidad_id,
        models.estudiante_unidad.c.habilitada == True
    ).first()
    
    if not acceso:
        print(f"⚠️ WARN: Sin acceso directo - permitiendo eliminación en SOLO TAREAS")
    
    # Directorio específico del estudiante
    student_dir = UPLOAD_DIR / "estudiantes" / current_user / f"unidad_{unidad_id}" / "SOLO_TAREAS"
    file_path = student_dir / filename
    
    print(f"🔍 DEBUG: Buscando archivo en: {file_path}")
    
    # Verificar que el archivo existe
    if not file_path.exists():
        print(f"❌ DEBUG: Archivo no encontrado: {file_path}")
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    
    # Verificar que es un archivo (no directorio)
    if not file_path.is_file():
        print(f"❌ DEBUG: No es un archivo válido: {file_path}")
        raise HTTPException(status_code=400, detail="No es un archivo válido")
    
    try:
        # Obtener información del archivo antes de eliminarlo
        file_size = file_path.stat().st_size
        original_name = filename
        
        # Eliminar el archivo
        file_path.unlink()
        print(f"✅ DEBUG: Archivo eliminado exitosamente: {filename}")
        
        # Eliminar archivo .meta.json si existe (limpieza)
        meta_path = file_path.with_name(file_path.name + ".meta.json")
        if meta_path.exists():
            try:
                meta_path.unlink()
                print(f"🧹 DEBUG: Archivo metadata eliminado: {meta_path.name}")
            except Exception as me:
                print(f"⚠️ WARN: No se pudo eliminar metadata: {me}")
        
        # Notificar a profesores asignados sobre la eliminación
        try:
            msg = f"El estudiante {current_user} eliminó el archivo '{original_name}' de SOLO TAREAS en la unidad #{unidad_id}."
            notifications_created = _notify_profesores_asignados(
                db, 
                estudiante_username=current_user, 
                mensaje=msg, 
                unidad_id=unidad_id, 
                tipo="eliminacion_tarea"
            )
            print(f"[NOTIFY] eliminacion_tarea -> profesores_notificados={notifications_created}")
        except Exception as e:
            print(f"[WARN] Notificación eliminación fallida: {e}")
        
        # Registrar actividad de eliminación
        try:
            crud.track_activity(
                db, 
                username=current_user, 
                unidad_id=unidad_id, 
                tipo_evento="eliminacion_tarea"
            )
        except Exception as e:
            print(f"[WARN] track_activity eliminacion_tarea fallido: {e}")
        
        return {
            "message": "Archivo eliminado exitosamente",
            "filename": filename,
            "original_name": original_name,
            "file_size": file_size,
            "unidad_id": unidad_id,
            "subcarpeta": subcarpeta_nombre,
            "deleted_by": current_user,
            "deleted_at": datetime.now().isoformat()
        }
        
    except FileNotFoundError:
        print(f"❌ DEBUG: Archivo ya no existe: {filename}")
        raise HTTPException(status_code=404, detail="El archivo ya no existe")
    except PermissionError:
        print(f"❌ DEBUG: Sin permisos para eliminar: {filename}")
        raise HTTPException(status_code=403, detail="Sin permisos para eliminar el archivo")
    except Exception as e:
        print(f"❌ DEBUG: Error eliminando archivo {filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Error eliminando archivo: {str(e)}")


# Solo lectura para EMPRESA/PROFESOR: listar tareas de un estudiante por unidad
@authRouter.get("/empresa/estudiantes/{username}/unidades/{unidad_id}/tareas")
def empresa_listar_tareas_estudiante(
    username: str,
    unidad_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Devuelve la lista de archivos de 'SOLO TAREAS' para un estudiante y unidad dada.
    Control de permisos:
      - empresa: puede ver TODOS los estudiantes.
      - profesor: solo estudiantes ASIGNADOS a ese profesor.
    """
    # Validar rol desde token
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        tipo = payload.get("tipo_usuario")
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

    if tipo == "empresa":
        pass  # acceso total
    elif tipo == "profesor":
        if not _estudiante_asignado_a_profesor(db, profesor_username=sub, estudiante_username=username):
            raise HTTPException(status_code=403, detail="Estudiante no asignado a este profesor")
    else:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    # Validar existencia de usuario
    estudiante = db.query(models.Registro).filter(models.Registro.username == username).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    base_dir = Path("/Users/sena/Desktop/Ingles/archivos_estudiantes") / "estudiantes" / username / f"unidad_{unidad_id}" / "SOLO_TAREAS"
    if not base_dir.exists():
        return {"files": []}

    files = []
    for file_path in base_dir.iterdir():
        if file_path.is_file():
            stat = file_path.stat()
            item = {
                "filename": file_path.name,
                "original_name": file_path.name.split('_', 2)[-1] if '_' in file_path.name else file_path.name,
                "size": stat.st_size,
                # Leer fecha desde sidecar si existe; fallback a mtime
                "upload_date": None
            }
            try:
                meta_path = file_path.with_name(file_path.name + ".meta.json")
                if meta_path.exists():
                    with open(meta_path, 'r', encoding='utf-8') as mf:
                        meta = json.load(mf)
                    item["upload_date"] = meta.get("upload_date")
            except Exception:
                pass
            if not item["upload_date"]:
                try:
                    item["upload_date"] = datetime.fromtimestamp(stat.st_mtime).isoformat()
                except Exception:
                    item["upload_date"] = datetime.now().isoformat()
            # Enriquecer con score y feedback
            try:
                row = db.query(models.TareaCalificacion).filter(
                    models.TareaCalificacion.estudiante_username == username,
                    models.TareaCalificacion.unidad_id == unidad_id,
                    models.TareaCalificacion.filename == file_path.name,
                ).first()
                if row:
                    item["score"] = int(row.score) if row.score is not None else None
                    try:
                        if hasattr(row, 'feedback'):
                            item["feedback"] = getattr(row, 'feedback')
                    except Exception:
                        pass
                if "score" not in item:
                    # fallback sidecar
                    try:
                        data = _grades_sidecar_get(username, unidad_id, file_path.name)
                        if data:
                            item["score"] = data.get('score')
                            item["feedback"] = data.get('feedback')
                    except Exception:
                        pass
            except Exception:
                pass
            files.append(item)

    # Ordenar por fecha desc
    files.sort(key=lambda f: f.get("upload_date", ""), reverse=True)
    return {"files": files}


@authRouter.get("/empresa/estudiantes/{username}/tareas")
def empresa_listar_todas_tareas_estudiante(
    username: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Lista TODAS las tareas del estudiante agrupadas por unidad (solo lectura).
    Permisos: empresa (todos), profesor (solo asignados)."""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        tipo = payload.get("tipo_usuario")
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")
    if tipo == "empresa":
        pass
    elif tipo == "profesor":
        if not _estudiante_asignado_a_profesor(db, profesor_username=sub, estudiante_username=username):
            raise HTTPException(status_code=403, detail="Estudiante no asignado a este profesor")
    else:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    # agrupar por unidad usando helper existente
    tareas = _listar_tareas_estudiante(username, None)
    grouped: dict[int, list] = {}
    for t in tareas:
        uid = t.get("unidad_id")
        grouped.setdefault(uid, []).append(t)
    # ordenar unidades por id asc
    unidades = []
    for uid in sorted([k for k in grouped.keys() if k is not None]):
        unidades.append({
            "unidad_id": uid,
            "files": grouped[uid]
        })
    return {"unidades": unidades}

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
    feedback: str | None = None

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
            # Guardar feedback si el modelo tiene el atributo
            try:
                if hasattr(row, 'feedback') and body.feedback is not None:
                    row.feedback = body.feedback
            except Exception:
                pass
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
            # Intentar setear feedback si existe la columna
            try:
                if hasattr(row, 'feedback') and body.feedback is not None:
                    setattr(row, 'feedback', body.feedback)
            except Exception:
                pass
            db.add(row)
        db.commit()
        db.refresh(row)
        # Sidecar JSON en filesystem si la tabla no tiene columna feedback
        try:
            if not hasattr(row, 'feedback') and body.feedback is not None:
                _grades_sidecar_save(estudiante_username, unidad_id, body.filename, score, body.feedback)
        except Exception:
            pass
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
    if row:
        feedback = None
        try:
            if hasattr(row, 'feedback'):
                feedback = getattr(row, 'feedback')
        except Exception:
            pass
        return {"score": int(row.score) if row.score is not None else None, "feedback": feedback}
    # fallback: sidecar
    try:
        data = _grades_sidecar_get(estudiante_username, unidad_id, filename)
        if data:
            return {"score": data.get('score'), "feedback": data.get('feedback')}
    except Exception:
        pass
    return {"score": None, "feedback": None}

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
def get_analytics_unidades_estudiante(
    current_user: str = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
    desde: str | None = None,
    hasta: str | None = None,
):
    """Analytics de unidades para el estudiante autenticado."""
    from datetime import datetime
    d_from = datetime.fromisoformat(desde) if desde else None
    d_to = datetime.fromisoformat(hasta) if hasta else None
    return crud.get_analytics_unidades(db, username=current_user, desde=d_from, hasta=d_to)

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
    data = _read_asistencia(clase_id)
    if not data:
        # Devolver metadatos y detalle de estudiantes con presente=False
        clase = db.query(models.Clase).filter(models.Clase.id == clase_id).first()
        if not clase:
            raise HTTPException(status_code=404, detail="Clase no encontrada")
        detalle = []
        for est in (clase.estudiantes or []):
            nombre = f"{est.nombres or ''} {est.apellidos or ''}".strip()
            ident = est.email or est.username or str(est.identificador)
            detalle.append({
                "nombre": nombre,
                "id": ident,
                "presente": False
            })
        total = len(detalle)
        presentes_count = 0
        return {
            "claseId": clase_id,
            "tema": clase.tema,
            "fecha": clase.dia,
            "hora": clase.hora,
            "presentes": [],
            "historial": [],
            "detalle": detalle,
            "total": total,
            "presentes_count": presentes_count,
            "ausentes_count": total - presentes_count
        }
    # Adjuntar metadatos y construir detalle con matching estricto
    clase = db.query(models.Clase).filter(models.Clase.id == clase_id).first()
    if not clase:
        return data
    data.update({"tema": clase.tema, "fecha": clase.dia, "hora": clase.hora})
    
    # Obtener presentes, con fallback al último historial si fuese necesario
    presentes_raw = data.get("presentes") or []
    if (not presentes_raw) and isinstance(data.get("historial"), list) and data["historial"]:
        try:
            last = data["historial"][-1]
            presentes_raw = last.get("presentes") or []
        except Exception:
            presentes_raw = []
    presentes_norm = [str(x).strip().lower() for x in presentes_raw]
    presentes_set = set(presentes_norm)
    
    # Derivar listas auxiliares para el front
    presentes_emails = [p for p in presentes_norm if '@' in p]
    presentes_usernames = [p.split('@')[0] if '@' in p else p for p in presentes_norm]
    
    detalle = []
    for est in (clase.estudiantes or []):
        nombre = f"{est.nombres or ''} {est.apellidos or ''}".strip()
        # Obtener email y username del estudiante
        email_raw = getattr(est, 'email', None)
        username_raw = getattr(est, 'username', None)
        email_norm = email_raw.strip().lower() if email_raw else ''
        username_norm = username_raw.strip().lower() if username_raw else ''
        
        # Matching estricto: priorizar igualdad exacta
        match = False
        # Prioridad 1: Igualdad EXACTA de username o email
        for pr in presentes_set:
            if username_norm and username_norm == pr:
                match = True
                break
            if email_norm and email_norm == pr:
                match = True
                break
        
        # Prioridad 2: Inclusión solo en casos muy específicos
        if not match:
            for pr in presentes_set:
                if len(pr) <= 15 and ' ' not in pr and '@' not in pr:
                    # Coincidencia por inclusión en email válido
                    if email_norm and '@' in email_norm and pr in email_norm:
                        match = True
                        break
                    # Coincidencia por inclusión en username significativamente más largo
                    if username_norm and len(username_norm) > len(pr) + 2 and pr in username_norm:
                        match = True
                        break
        
        detalle.append({
            "nombre": nombre,
            "id": email_raw or username_raw or str(est.identificador),
            "presente": bool(match)
        })
    
    data["detalle"] = detalle
    data["presentes_emails"] = presentes_emails
    data["presentes_usernames"] = presentes_usernames
    # Totales derivados
    data["total"] = len(detalle)
    data["presentes_count"] = sum(1 for d in detalle if d["presente"])
    data["ausentes_count"] = data["total"] - data["presentes_count"]
    return data

# Listado de clases para empresa con estado de asistencia
@authRouter.get("/empresa/clases")
def empresa_listar_clases(
    desde: str | None = None,
    hasta: str | None = None,
    db: Session = Depends(get_db),
    who=Depends(require_roles(["empresa", "admin"]))
):
    try:
        q = db.query(models.Clase)
        # Clase.dia se maneja como texto YYYY-MM-DD; aplica filtros directos
        if desde:
            q = q.filter(models.Clase.dia >= desde)
        if hasta:
            q = q.filter(models.Clase.dia <= hasta)
        clases = q.order_by(models.Clase.dia.desc(), models.Clase.hora.desc()).all()
        resp = []
        for c in clases:
            raw = _read_asistencia(c.id)
            data = raw or {}
            presentes = len(data.get("presentes", []))
            total = len(getattr(c, "estudiantes", []) or [])
            ausentes = max(total - presentes, 0)
            resp.append({
                "id": c.id,
                "dia": c.dia,
                "hora": c.hora,
                "tema": c.tema,
                "profesor_username": c.profesor_username,
                "total_inscritos": total,
                "presentes": presentes,
                "ausentes": ausentes,
                "tiene_asistencia": raw is not None
            })
        return resp
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listando clases para empresa: {e}")

def _estudiante_asignado_a_profesor(db: Session, profesor_username: str, estudiante_username: str) -> bool:
    """Verifica si un estudiante está asignado a un profesor."""
    profesor = db.query(models.Registro).filter(
        models.Registro.username == profesor_username,
        models.Registro.tipo_usuario == "profesor"
    ).first()

    if not profesor:
        return False

    estudiante = db.query(models.Registro).filter(
        models.Registro.username == estudiante_username,
        models.Registro.tipo_usuario == "estudiante"
    ).first()

    if not estudiante:
        return False

    # Verificar asignación en tabla profesor_estudiante
    asignacion = db.query(models.profesor_estudiante).filter(
        models.profesor_estudiante.c.profesor_id == profesor.identificador,
        models.profesor_estudiante.c.estudiante_id == estudiante.identificador
    ).first()

    return asignacion is not None

def _ensure_profesor_credentials(profesor_username: str, credentials: HTTPAuthorizationCredentials):
    """Valida que el token corresponda al profesor especificado."""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        token_username = payload.get("sub")
        token_tipo = payload.get("tipo_usuario")

        if token_username != profesor_username:
            raise HTTPException(status_code=403, detail="Token no corresponde al profesor")
        if token_tipo != "profesor":
            raise HTTPException(status_code=403, detail="Solo profesores pueden calificar tareas")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

def _listar_tareas_estudiante(username: str, unidad_id: int | None) -> list:
    """Lista tareas de un estudiante (simplificado)."""
    from pathlib import Path

    base_dir = Path("/Users/sena/Desktop/Ingles/archivos_estudiantes") / "estudiantes" / username
    if not base_dir.exists():
        return []

    tareas = []
    for unidad_path in base_dir.iterdir():
        if unidad_path.is_dir() and unidad_path.name.startswith("unidad_"):
            uid_str = unidad_path.name.replace("unidad_", "")
            try:
                uid = int(uid_str)
                if unidad_id is None or uid == unidad_id:
                    tareas_dir = unidad_path / "SOLO_TAREAS"
                    if tareas_dir.exists() and tareas_dir.is_dir():
                        for file_path in tareas_dir.iterdir():
                            if file_path.is_file():
                                stat = file_path.stat()
                                # Determinar fecha estable desde sidecar
                                upload_date_val = None
                                try:
                                    meta_path = file_path.with_name(file_path.name + ".meta.json")
                                    if meta_path.exists():
                                        with open(meta_path, 'r', encoding='utf-8') as mf:
                                            meta = json.load(mf)
                                        upload_date_val = meta.get("upload_date")
                                except Exception:
                                    pass
                                if not upload_date_val:
                                    try:
                                        upload_date_val = datetime.fromtimestamp(stat.st_mtime).isoformat()
                                    except Exception:
                                        upload_date_val = datetime.now().isoformat()
                                tareas.append({
                                    "unidad_id": uid,
                                    "filename": file_path.name,
                                    "original_name": file_path.name.split('_', 2)[-1] if '_' in file_path.name else file_path.name,
                                    "size": stat.st_size,
                                    "upload_date": upload_date_val
                                })
                    if unidad_id is not None:  # Si se especificó unidad_id, salir después de encontrarla
                        break
            except ValueError:
                continue

    return tareas

def _grades_sidecar_get(username: str, unidad_id: int, filename: str) -> dict | None:
    """Obtiene calificación desde archivo sidecar (simplificado)."""
    # Implementación simplificada - en producción esto vendría de la BD
    return None

# ==========================
# Archivos de Empresa/Profesor en Subcarpetas
# ==========================

@authRouter.post("/empresa/subcarpetas/{unidad_id}/{subcarpeta_id}/upload")
async def upload_empresa_file(
    unidad_id: int,
    subcarpeta_id: int,
    files: list[UploadFile] = File(...),
    current_user: str = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Endpoint para empresa/profesor - subir archivos a cualquier subcarpeta"""

    # Verificar permisos
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        tipo = payload.get("tipo_usuario")
        if tipo not in ["empresa", "profesor"]:
            raise HTTPException(status_code=403, detail="Solo empresa y profesor pueden subir archivos")
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

    # Crear directorio si no existe
    archivos_dir = Path("/Users/sena/Desktop/Ingles/archivos_empresa")
    archivos_dir.mkdir(exist_ok=True)
    user_dir = archivos_dir / current_user / f"unidad_{unidad_id}" / f"subcarpeta_{subcarpeta_id}"
    user_dir.mkdir(parents=True, exist_ok=True)

    print(f"🔍 DEBUG: current_user={current_user}, unidad_id={unidad_id}, subcarpeta_id={subcarpeta_id}")

    # Procesar múltiples archivos
    allowed_extensions = {'.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.zip', '.rar', '.ppt', '.pptx', '.xls', '.xlsx'}
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
        file_path = user_dir / safe_filename

        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            # Guardar metadata en BD via CRUD
            archivo_data = {
                "nombre_original": file.filename,
                "nombre_archivo": safe_filename,
                "tipo": file.content_type or "application/octet-stream",
                "tamano": file_path.stat().st_size,
                "es_link": False,
                "url": ""
            }

            crud.crear_archivo_empresa(db, unidad_id, subcarpeta_id, archivo_data, current_user)

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
        "subcarpeta_id": subcarpeta_id,
        "uploaded_by": current_user,
        "upload_date": datetime.now().isoformat()
    }

@authRouter.get("/empresa/subcarpetas/{unidad_id}/{subcarpeta_id}/files")
def get_empresa_files(
    unidad_id: int,
    subcarpeta_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: str = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Listar archivos subidos por empresa/profesor en una subcarpeta"""

    # Verificar permisos
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        tipo = payload.get("tipo_usuario")
        if tipo not in ["empresa", "profesor"]:
            raise HTTPException(status_code=403, detail="Solo empresa y profesor pueden ver archivos")
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

    archivos = crud.listar_archivos_empresa(db, unidad_id, subcarpeta_id, current_user)
    return {"files": archivos}

@authRouter.delete("/empresa/subcarpetas/{unidad_id}/{subcarpeta_id}/files/{archivo_id}")
def delete_empresa_file(
    unidad_id: int,
    subcarpeta_id: int,
    archivo_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: str = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Eliminar archivo de empresa/profesor"""

    # Verificar permisos
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        tipo = payload.get("tipo_usuario")
        if tipo not in ["empresa", "profesor"]:
            raise HTTPException(status_code=403, detail="Solo empresa y profesor pueden eliminar archivos")
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

    ok = crud.eliminar_archivo_empresa(unidad_id, subcarpeta_id, archivo_id, current_user)
    if not ok:
        raise HTTPException(status_code=500, detail="Error eliminando archivo")

    return {"eliminado": True, "archivo_id": archivo_id}

@authRouter.post("/empresa/subcarpetas/{unidad_id}/{subcarpeta_id}/links")
def crear_link_empresa(
    unidad_id: int,
    subcarpeta_id: int,
    body: dict = Body(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: str = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Adjuntar link en subcarpeta (empresa/profesor)"""

    # Verificar permisos
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        tipo = payload.get("tipo_usuario")
        if tipo not in ["empresa", "profesor"]:
            raise HTTPException(status_code=403, detail="Solo empresa y profesor pueden adjuntar links")
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

    nombre = body.get("nombre", "").strip()
    url = body.get("url", "").strip()

    if not nombre or not url:
        raise HTTPException(status_code=400, detail="Nombre y URL son requeridos")

    # Validar URL
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url

    archivo_data = {
        "nombre_original": nombre,
        "nombre_archivo": "",  # Links no tienen archivo físico
        "tipo": "link",
        "tamano": 0,
        "es_link": True,
        "url": url
    }

    link_data = crud.crear_archivo_empresa(db, unidad_id, subcarpeta_id, archivo_data, current_user)

    return {
        "message": "Link adjuntado correctamente",
        "link": link_data,
        "unidad_id": unidad_id,
        "subcarpeta_id": subcarpeta_id
    }

@authRouter.get("/empresa/subcarpetas/{unidad_id}/{subcarpeta_id}/files/{archivo_id}/download")
def download_empresa_file(
    unidad_id: int,
    subcarpeta_id: int,
    archivo_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: str = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Descargar archivo de empresa/profesor"""

    # Verificar permisos
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        tipo = payload.get("tipo_usuario")
        if tipo not in ["empresa", "profesor"]:
            raise HTTPException(status_code=403, detail="Solo empresa y profesor pueden descargar archivos")
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

    # Buscar metadata del archivo
    archivos_dir = Path("/Users/sena/Desktop/Ingles/archivos_empresa") / current_user / f"unidad_{unidad_id}" / f"subcarpeta_{subcarpeta_id}"
    metadata_file = archivos_dir / f"{archivo_id}.json"

    if not metadata_file.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    try:
        with open(metadata_file, 'r', encoding='utf-8') as f:
            archivo_data = json.load(f)

        # Si es link, redirigir
        if archivo_data.get("es_link"):
            from fastapi.responses import RedirectResponse
            return RedirectResponse(url=archivo_data["url"])

        # Si es archivo físico, servirlo
        archivo_fisico = archivos_dir / archivo_data["nombre_archivo"]
        if not archivo_fisico.exists():
            raise HTTPException(status_code=404, detail="Archivo físico no encontrado")

        import mimetypes
        content_type, _ = mimetypes.guess_type(str(archivo_fisico))
        if content_type is None:
            content_type = "application/octet-stream"

        from fastapi.responses import FileResponse
        return FileResponse(
            path=str(archivo_fisico),
            media_type=content_type,
            filename=archivo_data["nombre_original"]
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error descargando archivo: {e}")


  