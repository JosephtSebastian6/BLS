


# Imports
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, JSON
from sqlalchemy.orm import relationship
from Clever_MySQL_conn import Base
from datetime import datetime, datetime as dt, timedelta
from sqlalchemy import Table

class Registro(Base):
    __tablename__ = "estudiante"  # Nombre de la tabla en la base de datos

    identificador = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(100), nullable=False)
    numero_identificacion = Column(String(50), nullable=True)
    ciudad = Column(String(100), nullable=True)
    rh = Column(String(10), nullable=True)
    grupo_sanguineo = Column(String(10), nullable=True)
    nombres = Column(String(100), nullable = False)
    apellidos = Column(String(100), nullable=False)
    ano_nacimiento = Column(Integer, nullable=True)
    direccion = Column(String(150), nullable=True)
    telefono = Column(String(50), nullable=True)
    email= Column(String(150), nullable=True)
    profile_image_url = Column(String(255), nullable=True)

    email_verified = Column(Boolean, default=False)
    verification_token = Column(String(255), nullable=True)
    tipo_usuario = Column(String(20), nullable=False)  # estudiante, profesor, empresa
    token_expires_at = Column(DateTime, nullable=True)
    matricula_activa = Column(Boolean, default=True)  # Para estudiantes: si pueden acceder a la plataforma



# Tabla intermedia para la relación muchos a muchos entre Clase y Registro (estudiantes)


clase_estudiante = Table(
    'clase_estudiante', Base.metadata,
    Column('clase_id', Integer, ForeignKey('clase.id'), primary_key=True),
    Column('estudiante_id', Integer, ForeignKey('estudiante.identificador'), primary_key=True)
)

class Clase(Base):
    __tablename__ = "clase"
    id = Column(Integer, primary_key=True, index=True)
    dia = Column(String(20), nullable=False)
    hora = Column(String(20), nullable=False)
    tema = Column(String(255), nullable=False)
    meet_link = Column(String(255), nullable=True)
    profesor_username = Column(String(50), ForeignKey('estudiante.username'), nullable=False)
    unidad_id = Column(Integer, ForeignKey('unidad.id'), nullable=True)

    estudiantes = relationship(
        "Registro",
        secondary=clase_estudiante,
        primaryjoin="Clase.id==clase_estudiante.c.clase_id",
        secondaryjoin="Registro.identificador==clase_estudiante.c.estudiante_id",
        backref="clases"
    )

# Tabla para unidades
class Unidad(Base):
    __tablename__ = "unidad"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(String(255), nullable=True)
    orden = Column(Integer, default=0)

# Tabla de subcarpetas por unidad
class Subcarpeta(Base):
    __tablename__ = "subcarpeta"
    id = Column(Integer, primary_key=True, index=True)
    unidad_id = Column(Integer, ForeignKey('unidad.id'), nullable=False)
    nombre = Column(String(150), nullable=False)
    descripcion = Column(String(255), nullable=True)
    habilitada = Column(Boolean, default=True)
    orden = Column(Integer, default=0)

# Tabla intermedia para estudiante-unidad (qué unidades tiene habilitadas cada estudiante)
estudiante_unidad = Table(
    'estudiante_unidad', Base.metadata,
    Column('estudiante_id', Integer, ForeignKey('estudiante.identificador'), primary_key=True),
    Column('unidad_id', Integer, ForeignKey('unidad.id'), primary_key=True),
    Column('habilitada', Boolean, default=True)
)

# Tabla intermedia para profesor-estudiante (qué estudiantes están asignados a cada profesor)
profesor_estudiante = Table(
    'profesor_estudiante', Base.metadata,
    Column('profesor_id', Integer, ForeignKey('estudiante.identificador'), primary_key=True),
    Column('estudiante_id', Integer, ForeignKey('estudiante.identificador'), primary_key=True),
    Column('fecha_asignacion', DateTime, default=datetime.utcnow)
)

# Tabla de eventos de actividad del estudiante
class ActividadEstudiante(Base):
    __tablename__ = "actividad_estudiante"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), ForeignKey('estudiante.username'), nullable=False)
    unidad_id = Column(Integer, ForeignKey('unidad.id'), nullable=False)
    tipo_evento = Column(String(20), nullable=False)  # start | heartbeat | end
    duracion_min = Column(Integer, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    creado_at = Column(DateTime, default=datetime.utcnow)

# Tabla agregada de progreso por unidad
class EstudianteProgresoUnidad(Base):
    __tablename__ = "estudiante_progreso_unidad"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), ForeignKey('estudiante.username'), nullable=False)
    unidad_id = Column(Integer, ForeignKey('unidad.id'), nullable=False)
    porcentaje_completado = Column(Integer, default=0)
    score = Column(Integer, default=0)
    tiempo_dedicado_min = Column(Integer, default=0)
    ultima_actividad_at = Column(DateTime, nullable=True)

# Nueva tabla: calificaciones de tareas por archivo (por unidad y estudiante)
class TareaCalificacion(Base):
    __tablename__ = "tarea_calificacion"
    id = Column(Integer, primary_key=True, index=True)
    estudiante_username = Column(String(50), ForeignKey('estudiante.username'), nullable=False)
    unidad_id = Column(Integer, ForeignKey('unidad.id'), nullable=False)
    filename = Column(String(255), nullable=False)
    score = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

# Asignaciones de Quiz a Unidades (ventanas de disponibilidad)
class QuizAsignacion(Base):
    __tablename__ = "quiz_asignacion"
    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey('quiz.id'), nullable=False)
    unidad_id = Column(Integer, ForeignKey('unidad.id'), nullable=False)
    start_at = Column(DateTime, nullable=True)
    end_at = Column(DateTime, nullable=True)
    tiempo_limite_minutos = Column(Integer, nullable=True)  # NULL o 0 = sin límite de tiempo
    max_intentos = Column(Integer, nullable=True)  # NULL o 0 = intentos ilimitados
    created_at = Column(DateTime, default=datetime.utcnow)

# Calificación global/override de unidad
class UnidadCalificacionFinal(Base):
    __tablename__ = "unidad_calificacion_final"
    id = Column(Integer, primary_key=True, index=True)
    estudiante_username = Column(String(50), ForeignKey('estudiante.username'), nullable=False)
    unidad_id = Column(Integer, ForeignKey('unidad.id'), nullable=False)
    score = Column(Integer, nullable=True)
    aprobado = Column(Boolean, default=None)  # None = sin override
    updated_at = Column(DateTime, default=datetime.utcnow)

# ===== Quizzes por unidad
class Quiz(Base):
    __tablename__ = "quiz"
    id = Column(Integer, primary_key=True, index=True)
    unidad_id = Column(Integer, ForeignKey('unidad.id'), nullable=False)
    titulo = Column(String(200), nullable=False)
    descripcion = Column(String(500), nullable=True)
    preguntas = Column(JSON, nullable=True)  # estructura libre para prototipo
    created_at = Column(DateTime, default=datetime.utcnow)

# Calificación de quizzes por estudiante
class EstudianteQuizCalificacion(Base):
    __tablename__ = "estudiante_quiz_calificacion"
    id = Column(Integer, primary_key=True, index=True)
    estudiante_username = Column(String(50), ForeignKey('estudiante.username'), nullable=False)
    unidad_id = Column(Integer, ForeignKey('unidad.id'), nullable=False)
    quiz_id = Column(Integer, ForeignKey('quiz.id'), nullable=False)
    score = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    aprobada = Column(Boolean, default=False)
    aprobada_por = Column(String(50), ForeignKey('estudiante.username'), nullable=True)
    aprobada_at = Column(DateTime, nullable=True)
    origen_manual = Column(Boolean, default=False)
    comentario_profesor = Column(String(500), nullable=True)

# Permisos individuales de quiz por estudiante
class EstudianteQuizPermiso(Base):
    __tablename__ = "estudiante_quiz_permiso"
    id = Column(Integer, primary_key=True, index=True)
    estudiante_username = Column(String(50), ForeignKey('estudiante.username'), nullable=False)
    quiz_id = Column(Integer, ForeignKey('quiz.id'), nullable=False)
    habilitado = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

# Respuestas de quizzes por estudiante
class EstudianteQuizRespuesta(Base):
    __tablename__ = "estudiante_quiz_respuesta"
    id = Column(Integer, primary_key=True, index=True)
    estudiante_username = Column(String(50), ForeignKey('estudiante.username'), nullable=False)
    quiz_id = Column(Integer, ForeignKey('quiz.id'), nullable=False)
    unidad_id = Column(Integer, ForeignKey('unidad.id'), nullable=False)
    respuestas = Column(JSON, nullable=False)  # {"pregunta_1": "respuesta_a", "pregunta_2": "respuesta_b"}
    score = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class EstudianteQuizIntento(Base):
    __tablename__ = "estudiante_quiz_intento"
    id = Column(Integer, primary_key=True, index=True)
    estudiante_username = Column(String(50), ForeignKey('estudiante.username'), nullable=False)
    quiz_id = Column(Integer, ForeignKey('quiz.id'), nullable=False)
    unidad_id = Column(Integer, ForeignKey('unidad.id'), nullable=False)
    intento_num = Column(Integer, nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

# ===== Notificaciones =====
class Notificacion(Base):
    __tablename__ = "notificaciones"
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey('estudiante.identificador'), nullable=False)  # destinatario (empresa/profesor/estudiante)
    tipo = Column(String(50), nullable=False)
    mensaje = Column(String(500), nullable=False)
    leida = Column(Boolean, default=False)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    usuario_remitente_id = Column(Integer, ForeignKey('estudiante.identificador'), nullable=True)  # opcional
    unidad_id = Column(Integer, ForeignKey('unidad.id'), nullable=True)