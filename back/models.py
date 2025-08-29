


# Imports
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from Clever_MySQL_conn import Base
from datetime import datetime, timedelta
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