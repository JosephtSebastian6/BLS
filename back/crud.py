# crud.py
from sqlalchemy.orm import Session
# Importaciones necesarias para Jinja2
from jinja2 import Environment, FileSystemLoader, select_autoescape
from passlib.context import CryptContext
from fastapi import BackgroundTasks, Request, HTTPException
from pydantic import EmailStr
import uuid
from datetime import datetime, timedelta
from pathlib import Path
import os
from urllib.parse import urljoin

# Importaciones para el envío directo con aiosmtplib
from aiosmtplib import SMTP
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import models, schemas
from config import conf

bcrypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")



# Función para registrar un nuevo usuario (sin cambios aquí)
async def registro_user(db: Session, user: schemas.RegistroCreate, background_tasks: BackgroundTasks, request: Request):
    print(f"DEBUG CRUD: Iniciando registro para usuario: {user.username}, email: {user.email}")
    print(f"DEBUG CRUD: Datos completos recibidos: {user.dict()}")

    existing_user_email = db.query(models.Registro).filter(models.Registro.email == user.email).first()
    if existing_user_email:
        print(f"DEBUG CRUD: ERROR - Email {user.email} ya registrado.")
        raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado.")

    existing_user_username = db.query(models.Registro).filter(models.Registro.username == user.username).first()
    if existing_user_username:
        print(f"DEBUG CRUD: ERROR - Nombre de usuario {user.username} ya registrado.")
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está registrado.")

    verification_token = str(uuid.uuid4())
    token_expires_at = datetime.utcnow() + timedelta(hours=24)

    hashed_pw = bcrypt_context.hash(user.password)
    nuevo_registro = models.Registro(
        username=user.username,
        hashed_password=hashed_pw,
        nombres=user.nombres,
        apellidos=user.apellidos,
        email=user.email,
        email_verified=False,
        verification_token=verification_token,
        tipo_usuario=user.tipo_usuario,
        token_expires_at=token_expires_at
    )

    try:
        db.add(nuevo_registro)
        print("DEBUG CRUD: Objeto de usuario añadido a la sesión de DB.")
        db.commit()
        print("DEBUG CRUD: Commit a la base de datos realizado.")
        db.refresh(nuevo_registro)
        print(f"DEBUG CRUD: Usuario refrescado desde DB: {nuevo_registro.username}, ID: {nuevo_registro.identificador}")
    except Exception as e:
        db.rollback()
        print(f"DEBUG CRUD: ERROR FATAL en la base de datos durante el commit: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor al guardar usuario: {e}")

    base_url_str = str(request.base_url)
    path_to_verify = f"auth/verify-email?token={verification_token}"
    verification_url = urljoin(base_url_str, path_to_verify)
    print(f"DEBUG CRUD: URL de verificación generada: {verification_url}")

    await send_verification_email(
        recipient_email=nuevo_registro.email,
        username=nuevo_registro.username,
        verification_url=verification_url,
        background_tasks=background_tasks,
        request=request
    )
    print("DEBUG CRUD: Correo de verificación programado para envío.")

    return nuevo_registro

# Función para autenticar un usuario (sin cambios aquí)
def autenticar_usuario(db: Session, username: str, password: str):
    user = db.query(models.Registro).filter(models.Registro.username == username).first()
    if user and bcrypt_context.verify(password, user.hashed_password):
        return user
    return None

# --- FUNCIÓN send_verification_email CORREGIDA ---
# Aquí se usa exclusivamente aiosmtplib para construir y enviar el correo.
async def send_verification_email(recipient_email: EmailStr, username: str, verification_url: str, background_tasks: BackgroundTasks, request: Request):
    print(f"DEBUG EMAIL: Preparando el envío de correo a {recipient_email}")

    template_env = Environment(
        loader=FileSystemLoader(conf.TEMPLATE_FOLDER),
        autoescape=select_autoescape(["html", "xml"])
    )

    try:
        template = template_env.get_template("verification.html")
        print("DEBUG EMAIL: Plantilla 'verification.html' cargada exitosamente.")
    except Exception as e:
        print(f"ERROR EMAIL: No se pudo cargar la plantilla 'verification.html'. Error: {e}")
        raise HTTPException(status_code=500, detail=f"Error al cargar la plantilla de correo: {e}")

    rendered_html = template.render(
        username=username,
        verification_url=verification_url,
        request=request
    )
    print("DEBUG EMAIL: Plantilla HTML renderizada.")

    msg = MIMEMultipart("alternative")
    msg["From"] = f"{conf.MAIL_FROM_NAME} <{conf.MAIL_FROM}>"
    msg["To"] = recipient_email
    msg["Subject"] = "Verifica tu Correo Electrónico"

    html_part = MIMEText(rendered_html, "html", "utf-8")
    msg.attach(html_part)
    print("DEBUG EMAIL: Mensaje MIME construido.")

    async def _send_email_task():
        print(f"DEBUG EMAIL TASK: Iniciando tarea de envío de correo para {recipient_email}")
        try:
            client = SMTP(
                hostname=conf.MAIL_SERVER,
                port=conf.MAIL_PORT,
                start_tls=conf.MAIL_STARTTLS,
                use_tls=conf.MAIL_SSL_TLS,
                validate_certs=conf.VALIDATE_CERTS
            )
            print("DEBUG EMAIL TASK: Cliente SMTP creado.")
            await client.connect()
            print("DEBUG EMAIL TASK: Conexión SMTP establecida.")
            await client.login(conf.MAIL_USERNAME, conf.MAIL_PASSWORD)
            print("DEBUG EMAIL TASK: Login SMTP exitoso.")
            
            status_code, message_response = await client.send_message(msg)
            await client.quit()
            print("DEBUG EMAIL TASK: Desconexión SMTP realizada.")

            print(f"DEBUG EMAIL TASK: Correo enviado exitosamente en segundo plano. Estado: {status_code}, Mensaje: {message_response}")

        except Exception as e:
            print(f"ERROR EMAIL TASK: EXCEPCIÓN al enviar correo en segundo plano: {e}")
            raise # Re-lanzar la excepción para que FastAPI la capture y la registre

    background_tasks.add_task(_send_email_task)
    print("DEBUG EMAIL: Tarea de envío de correo añadida a BackgroundTasks.")

def obtener_estudiantes_disponibles(db):
    return db.query(models.Registro).filter(models.Registro.tipo_usuario == "estudiante").all()

# Obtener clases de un profesor por su identificador
def obtener_clases_profesor(db, profesor_username):
    # Devuelve todas las clases de un profesor, incluyendo los estudiantes asociados
    clases = db.query(models.Clase).filter(models.Clase.profesor_username == profesor_username).all()
    return clases

# Agendar estudiante a clase (añadir estudiante a la relación muchos a muchos)
def agendar_estudiante_a_clase(db, clase_id, estudiante_username):
    from models import Clase, Registro
    clase = db.query(Clase).filter(Clase.id == clase_id).first()
    if not clase:
        return None
    estudiante = db.query(Registro).filter(Registro.username == estudiante_username).first()
    if not estudiante:
        return None
    if estudiante not in clase.estudiantes:
        clase.estudiantes.append(estudiante)
        db.commit()
        db.refresh(clase)
    return clase

# Obtener profesor por username
def get_profesor_by_username(db: Session, username: str):
    return db.query(models.Registro).filter(
        models.Registro.username == username
    ).first()
# Crear una clase y asociar estudiantes (relación muchos a muchos)
def crear_clase(db, clase_data):
    # clase_data debe ser un objeto tipo schemas.ClaseCreate
    from models import Clase, Registro
    # Buscar estudiantes por username
    estudiantes_objs = []
    if clase_data.estudiantes:
        estudiantes_objs = db.query(Registro).filter(Registro.username.in_(clase_data.estudiantes)).all()

    nueva_clase = Clase(
        dia=clase_data.dia,
        hora=clase_data.hora,
        tema=clase_data.tema,
        meet_link=clase_data.meet_link,
        profesor_username=clase_data.profesor_username,
        estudiantes=estudiantes_objs
    )
    db.add(nueva_clase)
    db.commit()
    db.refresh(nueva_clase)
    return nueva_clase

def update_perfil_estudiante(db, perfil):
    print(f"DEBUG UPDATE PERFIL: Recibido perfil: {perfil}")
    user = db.query(models.Registro).filter(models.Registro.username == perfil.get('username')).first()
    print(f"DEBUG UPDATE PERFIL: Usuario encontrado: {user}")
    if not user:
        return None
    # Actualiza los campos permitidos
    for campo in [
        'nombres', 'apellidos', 'numero_identificacion', 'ciudad', 'rh', 'grupo_sanguineo',
        'ano_nacimiento', 'direccion', 'telefono', 'email', 'profile_image_url'
    ]:
        if campo in perfil:
            setattr(user, campo, perfil[campo])
    db.commit()
    db.refresh(user)
    print(f"DEBUG UPDATE PERFIL: Usuario actualizado: {user}")
    return user

def obtener_clases_estudiante(db, estudiante_username):
    """
    Devuelve todas las clases a las que está inscrito un estudiante.
    """
    from models import Clase, Registro
    estudiante = db.query(Registro).filter(Registro.username == estudiante_username).first()
    if not estudiante:
        return []
    # Relación muchos a muchos: estudiante.clases
    return estudiante.clases

# Eliminar clases con antigüedad mayor a 'dias' (opcionalmente por profesor)
def eliminar_clases_antiguas(db: Session, dias: int = 15, profesor_username: str | None = None) -> int:
    from models import Clase, clase_estudiante
    limite_dt = datetime.utcnow() - timedelta(days=dias)

    # Traer clases candidatas
    q = db.query(Clase)
    if profesor_username:
        q = q.filter(Clase.profesor_username == profesor_username)

    clases = q.all()
    a_eliminar = []
    for c in clases:
        try:
            # c.dia formato 'YYYY-MM-DD', c.hora 'HH:MM' o 'HH:MM:SS'
            hora = (c.hora or '00:00')[:5]
            fecha_hora = datetime.strptime(f"{c.dia} {hora}", "%Y-%m-%d %H:%M")
        except Exception:
            # Si hay error parseando, no eliminar por seguridad
            continue
        if fecha_hora < limite_dt:
            a_eliminar.append(c)

    count = 0
    for c in a_eliminar:
        try:
            # Borrar relaciones en tabla pivot
            db.execute(
                clase_estudiante.delete().where(clase_estudiante.c.clase_id == c.id)
            )
            db.delete(c)
            count += 1
        except Exception:
            db.rollback()
            continue

    if count:
        db.commit()
    return count

# Eliminar una clase por ID (incluye limpieza de relaciones pivot)
def eliminar_clase(db: Session, clase_id: int) -> bool:
    from models import Clase, clase_estudiante
    clase = db.query(Clase).filter(Clase.id == clase_id).first()
    if not clase:
        return False
    try:
        db.execute(
            clase_estudiante.delete().where(clase_estudiante.c.clase_id == clase.id)
        )
        db.delete(clase)
        db.commit()
        return True
    except Exception:
        db.rollback()
        return False

# crud.py
def obtener_profesores(db):
    return db.query(models.Registro).filter(models.Registro.tipo_usuario == "profesor").all()

def obtener_estudiantes(db):
    """Obtiene todos los estudiantes registrados en la plataforma"""
    return db.query(models.Registro).filter(models.Registro.tipo_usuario == "estudiante").all()

def toggle_matricula_estudiante(db: Session, username: str):
    """Activa o desactiva la matrícula de un estudiante"""
    estudiante = db.query(models.Registro).filter(models.Registro.username == username).first()
    if estudiante:
        estudiante.matricula_activa = not estudiante.matricula_activa
        db.commit()
        db.refresh(estudiante)
    return estudiante

# Funciones CRUD para gestión de unidades
def sincronizar_unidades(db: Session, unidades_frontend: list):
    """Sincroniza las unidades del frontend con la base de datos"""
    # Primero eliminar las relaciones en estudiante_unidad
    db.execute(models.estudiante_unidad.delete())
    db.commit()
    
    # Luego eliminar las unidades existentes
    db.query(models.Unidad).delete()
    db.commit()
    
    # Insertar nuevas unidades
    for i, unidad in enumerate(unidades_frontend):
        nueva_unidad = models.Unidad(
            nombre=unidad.get('nombre', ''),
            descripcion=unidad.get('descripcion', ''),
            orden=i + 1
        )
        db.add(nueva_unidad)
    
    db.commit()
    return {"message": f"Se sincronizaron {len(unidades_frontend)} unidades"}

def obtener_unidades(db: Session):
    """Obtiene todas las unidades disponibles"""
    unidades = db.query(models.Unidad).order_by(models.Unidad.orden).all()
    return [{"id": u.id, "nombre": u.nombre, "descripcion": u.descripcion, "orden": u.orden} for u in unidades]

def toggle_unidad_estudiante(db: Session, username: str, unidad_id: int):
    """Habilita o deshabilita una unidad para un estudiante"""
    estudiante = db.query(models.Registro).filter(models.Registro.username == username).first()
    if not estudiante:
        return None
    
    # Verificar si ya existe la relación
    relacion = db.query(models.estudiante_unidad).filter(
        models.estudiante_unidad.c.estudiante_id == estudiante.identificador,
        models.estudiante_unidad.c.unidad_id == unidad_id
    ).first()
    
    if relacion:
        # Actualizar estado existente
        db.execute(
            models.estudiante_unidad.update().where(
                (models.estudiante_unidad.c.estudiante_id == estudiante.identificador) &
                (models.estudiante_unidad.c.unidad_id == unidad_id)
            ).values(habilitada=not relacion.habilitada)
        )
        nuevo_estado = not relacion.habilitada
    else:
        # Si no existe relación, significa que está "habilitada" por defecto (mostrando todas)
        # Así que al hacer toggle, la deshabilitamos
        db.execute(
            models.estudiante_unidad.insert().values(
                estudiante_id=estudiante.identificador,
                unidad_id=unidad_id,
                habilitada=False
            )
        )
        nuevo_estado = False
    
    db.commit()
    return nuevo_estado

def obtener_unidades_habilitadas_estudiante(db: Session, username: str):
    """Obtiene las unidades habilitadas para un estudiante específico"""
    estudiante = db.query(models.Registro).filter(models.Registro.username == username).first()
    if not estudiante:
        return []
    
    # Verificar si el estudiante tiene alguna configuración de unidades
    tiene_configuracion = db.query(models.estudiante_unidad).filter(
        models.estudiante_unidad.c.estudiante_id == estudiante.identificador
    ).first()
    
    if not tiene_configuracion:
        # Si no tiene configuración, mostrar todas las unidades disponibles
        todas_unidades = db.query(models.Unidad).order_by(models.Unidad.orden).all()
        return [{"id": u.id, "nombre": u.nombre, "descripcion": u.descripcion, "orden": u.orden} for u in todas_unidades]
    
    # Si tiene configuración, obtener solo las habilitadas
    unidades_habilitadas_query = db.query(
        models.Unidad.id,
        models.Unidad.nombre,
        models.Unidad.descripcion,
        models.Unidad.orden
    ).join(
        models.estudiante_unidad,
        models.Unidad.id == models.estudiante_unidad.c.unidad_id
    ).filter(
        models.estudiante_unidad.c.estudiante_id == estudiante.identificador,
        models.estudiante_unidad.c.habilitada == True
    ).order_by(models.Unidad.orden)
    
    unidades_habilitadas = []
    for unidad in unidades_habilitadas_query.all():
        unidades_habilitadas.append({
            "id": unidad.id,
            "nombre": unidad.nombre,
            "descripcion": unidad.descripcion,
            "orden": unidad.orden
        })
    
    # Obtener también las unidades que no tienen configuración específica (están habilitadas por defecto)
    unidades_configuradas = db.query(models.estudiante_unidad.c.unidad_id).filter(
        models.estudiante_unidad.c.estudiante_id == estudiante.identificador
    ).all()
    
    ids_configuradas = [row[0] for row in unidades_configuradas]
    
    # Agregar unidades sin configuración (habilitadas por defecto)
    unidades_sin_config = db.query(models.Unidad).filter(
        ~models.Unidad.id.in_(ids_configuradas)
    ).order_by(models.Unidad.orden).all()
    
    for unidad in unidades_sin_config:
        unidades_habilitadas.append({
            "id": unidad.id,
            "nombre": unidad.nombre,
            "descripcion": unidad.descripcion,
            "orden": unidad.orden
        })
    
    # Ordenar por orden
    unidades_habilitadas.sort(key=lambda x: x["orden"])
    
    return unidades_habilitadas

def obtener_estado_unidades_estudiante(db: Session, username: str):
    """Obtiene todas las unidades con su estado (habilitada/deshabilitada) para un estudiante"""
    estudiante = db.query(models.Registro).filter(models.Registro.username == username).first()
    if not estudiante:
        return []
    
    # Obtener todas las unidades
    todas_unidades = db.query(models.Unidad).order_by(models.Unidad.orden).all()
    
    # Obtener configuraciones del estudiante
    configuraciones = {}
    relaciones = db.query(models.estudiante_unidad).filter(
        models.estudiante_unidad.c.estudiante_id == estudiante.identificador
    ).all()
    
    for relacion in relaciones:
        configuraciones[relacion.unidad_id] = relacion.habilitada
    
    # Verificar si el estudiante tiene alguna configuración
    tiene_configuracion = len(relaciones) > 0
    
    # Construir respuesta con estado
    resultado = []
    for unidad in todas_unidades:
        # Usar el estado específico de la configuración, o True por defecto si no existe
        habilitada = configuraciones.get(unidad.id, True)
        
        resultado.append({
            "id": unidad.id,
            "nombre": unidad.nombre,
            "descripcion": unidad.descripcion,
            "orden": unidad.orden,
            "habilitada": habilitada
        })
    
    return resultado

# Funciones CRUD para gestión de asignaciones profesor-estudiante
def obtener_estudiantes_asignados(db: Session, profesor_username: str):
    """Obtiene los estudiantes asignados a un profesor"""
    profesor = db.query(models.Registro).filter(
        models.Registro.username == profesor_username,
        models.Registro.tipo_usuario == "profesor"
    ).first()
    
    if not profesor:
        return []
    
    estudiantes = db.query(models.Registro).join(
        models.profesor_estudiante,
        models.Registro.identificador == models.profesor_estudiante.c.estudiante_id
    ).filter(
        models.profesor_estudiante.c.profesor_id == profesor.identificador,
        models.Registro.tipo_usuario == "estudiante"
    ).all()
    
    return estudiantes

def asignar_estudiante_profesor(db: Session, profesor_username: str, estudiante_username: str):
    """Asigna un estudiante a un profesor"""
    profesor = db.query(models.Registro).filter(
        models.Registro.username == profesor_username,
        models.Registro.tipo_usuario == "profesor"
    ).first()
    
    estudiante = db.query(models.Registro).filter(
        models.Registro.username == estudiante_username,
        models.Registro.tipo_usuario == "estudiante"
    ).first()
    
    if not profesor or not estudiante:
        return False
    
    # Verificar si ya está asignado
    existing = db.execute(
        models.profesor_estudiante.select().where(
            models.profesor_estudiante.c.profesor_id == profesor.identificador,
            models.profesor_estudiante.c.estudiante_id == estudiante.identificador
        )
    ).first()
    
    if existing:
        return True  # Ya está asignado
    
    # Crear nueva asignación
    db.execute(
        models.profesor_estudiante.insert().values(
            profesor_id=profesor.identificador,
            estudiante_id=estudiante.identificador
        )
    )
    db.commit()
    return True

# ==========================
# Tracking & Analytics (Nuevo)
# ==========================

def _ensure_progreso_row(db: Session, username: str, unidad_id: int):
    row = db.query(models.EstudianteProgresoUnidad).filter(
        models.EstudianteProgresoUnidad.username == username,
        models.EstudianteProgresoUnidad.unidad_id == unidad_id
    ).first()
    if not row:
        row = models.EstudianteProgresoUnidad(
            username=username,
            unidad_id=unidad_id,
            porcentaje_completado=0,
            score=0,
            tiempo_dedicado_min=0,
            ultima_actividad_at=datetime.utcnow()
        )
        db.add(row)
        db.commit()
        db.refresh(row)
    return row

def track_activity(db: Session, username: str, unidad_id: int, tipo_evento: str, duracion_min: int | None = None, metadata: dict | None = None):
    evento = models.ActividadEstudiante(
        username=username,
        unidad_id=unidad_id,
        tipo_evento=tipo_evento,
        duracion_min=duracion_min,
        metadata_json=metadata or {},
        creado_at=datetime.utcnow()
    )
    db.add(evento)

    # Acumular tiempo si corresponde
    if duracion_min and duracion_min > 0:
        row = _ensure_progreso_row(db, username, unidad_id)
        row.tiempo_dedicado_min = (row.tiempo_dedicado_min or 0) + int(duracion_min)
        row.ultima_actividad_at = datetime.utcnow()
        db.add(row)

    db.commit()
    return {"ok": True}

def upsert_progreso_score(db: Session, username: str, unidad_id: int, porcentaje_completado: int | None = None, score: int | None = None):
    row = _ensure_progreso_row(db, username, unidad_id)
    if porcentaje_completado is not None:
        row.porcentaje_completado = max(0, min(100, int(porcentaje_completado)))
    if score is not None:
        row.score = max(0, min(100, int(score)))
    row.ultima_actividad_at = datetime.utcnow()
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

def get_analytics_resumen(db: Session, username: str, desde: datetime | None = None, hasta: datetime | None = None):
    # Tiempo total: si hay rango, sumar desde eventos; si no, usar tabla agregada
    q_prog = db.query(models.EstudianteProgresoUnidad).filter(models.EstudianteProgresoUnidad.username == username)
    if desde or hasta:
        q_ev = db.query(models.ActividadEstudiante).filter(models.ActividadEstudiante.username == username)
        if desde:
            q_ev = q_ev.filter(models.ActividadEstudiante.creado_at >= desde)
        if hasta:
            q_ev = q_ev.filter(models.ActividadEstudiante.creado_at <= hasta)
        tiempo_total = sum([(e.duracion_min or 0) for e in q_ev.all()])
    else:
        tiempo_total = sum([(r.tiempo_dedicado_min or 0) for r in q_prog.all()])

    # Progreso general: promedio de porcentaje_completado de las unidades con fila; si no hay filas, 0
    rows = q_prog.all()
    progreso_general = (sum([r.porcentaje_completado or 0 for r in rows]) / len(rows)) if rows else 0

    # Unidades completadas (no depende de rango)
    unidades_completadas = db.query(models.EstudianteProgresoUnidad).filter(
        models.EstudianteProgresoUnidad.username == username,
        models.EstudianteProgresoUnidad.porcentaje_completado == 100
    ).count()

    # Racha de días: contar días consecutivos con eventos (aplicar rango si se pasa)
    q_ev_racha = db.query(models.ActividadEstudiante).filter(models.ActividadEstudiante.username == username)
    if desde:
        q_ev_racha = q_ev_racha.filter(models.ActividadEstudiante.creado_at >= desde)
    if hasta:
        q_ev_racha = q_ev_racha.filter(models.ActividadEstudiante.creado_at <= hasta)
    eventos = q_ev_racha.order_by(models.ActividadEstudiante.creado_at.desc()).all()
    dias = sorted({e.creado_at.date() for e in eventos}, reverse=True)
    racha = 0
    if dias:
        hoy = datetime.utcnow().date()
        cursor = hoy
        for d in dias:
            if d == cursor:
                racha += 1
                cursor = cursor - timedelta(days=1)
            elif d < cursor:
                # hueco
                break

    return {
        "progreso_general": round(progreso_general, 2),
        "unidades_completadas": int(unidades_completadas),
        "tiempo_dedicado_min": int(tiempo_total),
        "racha_dias": int(racha)
    }

def get_analytics_unidades(db: Session, username: str, desde: datetime | None = None, hasta: datetime | None = None):
    # Traer todas las unidades
    unidades = db.query(models.Unidad).order_by(models.Unidad.orden).all()
    prog_rows = db.query(models.EstudianteProgresoUnidad).filter(
        models.EstudianteProgresoUnidad.username == username
    ).all()
    prog_map = {(r.unidad_id): r for r in prog_rows}

    # Si hay rango, computar tiempo desde eventos por unidad
    tiempos_por_unidad = {}
    if desde or hasta:
        q_ev = db.query(models.ActividadEstudiante).filter(models.ActividadEstudiante.username == username)
        if desde:
            q_ev = q_ev.filter(models.ActividadEstudiante.creado_at >= desde)
        if hasta:
            q_ev = q_ev.filter(models.ActividadEstudiante.creado_at <= hasta)
        for e in q_ev.all():
            uid = e.unidad_id
            if uid is None:
                continue
            tiempos_por_unidad[uid] = tiempos_por_unidad.get(uid, 0) + (e.duracion_min or 0)

    # Conteo de tareas por unidad (en filesystem) y promedio de calificaciones (en BD)
    TASKS_BASE = Path("/Users/sena/Desktop/Ingles/archivos_estudiantes")
    resultado = []
    for u in unidades:
        r = prog_map.get(u.id)
        tiempo_min = tiempos_por_unidad.get(u.id) if (desde or hasta) else (int(r.tiempo_dedicado_min) if r else 0)
        # Contar archivos y leer calificaciones
        tareas_count = 0
        tareas_score_avg = None
        try:
            carpeta = TASKS_BASE / "estudiantes" / username / f"unidad_{u.id}" / "SOLO_TAREAS"
            if carpeta.exists() and carpeta.is_dir():
                tareas = [f for f in os.listdir(carpeta) if (carpeta / f).is_file() and f != 'grades.json']
                tareas_count = len(tareas)
        except Exception:
            pass
        # Promedio de calificaciones desde BD
        try:
            from sqlalchemy import func as sa_func
            avg_score = db.query(sa_func.avg(models.TareaCalificacion.score)).filter(
                models.TareaCalificacion.estudiante_username == username,
                models.TareaCalificacion.unidad_id == u.id
            ).scalar()
            if avg_score is not None:
                tareas_score_avg = float(avg_score)
        except Exception:
            tareas_score_avg = tareas_score_avg

        # Score base: si hay promedio de tareas, úsalo; si no, toma el guardado en progreso
        base_score = tareas_score_avg if tareas_score_avg is not None else (int(r.score) if r else 0)
        # Tiempo -> score de tiempo contra objetivo 120 min
        objetivo_min = 120
        tiempo_score = min(100, int((tiempo_min or 0) * 100 / objetivo_min)) if objetivo_min > 0 else 0
        porcentaje = int(round(0.6 * base_score + 0.4 * tiempo_score))

        resultado.append({
            "unidad_id": u.id,
            "nombre": u.nombre,
            "porcentaje_completado": porcentaje,
            "score": int(base_score),
            "tiempo_min": int(tiempo_min or 0),
            "tareas_count": int(tareas_count)
        })
    return resultado

def desasignar_estudiante_profesor(db: Session, profesor_username: str, estudiante_username: str):
    """Desasigna un estudiante de un profesor"""
    profesor = db.query(models.Registro).filter(
        models.Registro.username == profesor_username,
        models.Registro.tipo_usuario == "profesor"
    ).first()
    
    estudiante = db.query(models.Registro).filter(
        models.Registro.username == estudiante_username,
        models.Registro.tipo_usuario == "estudiante"
    ).first()
    
    if not profesor or not estudiante:
        return False
    
    # Eliminar asignación
    db.execute(
        models.profesor_estudiante.delete().where(
            models.profesor_estudiante.c.profesor_id == profesor.identificador,
            models.profesor_estudiante.c.estudiante_id == estudiante.identificador
        )
    )
    db.commit()
    return True
