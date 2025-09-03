


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