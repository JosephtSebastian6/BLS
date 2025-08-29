# Esquemas para Clase



# Pydantic imports (must be at the top)
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime



class PerfilUpdate(BaseModel):
    username: str
    email: EmailStr
    numero_identificacion: Optional[str] = None
    ciudad: Optional[str] = None
    rh: Optional[str] = None
    grupo_sanguineo: Optional[str] = None
    nombres: Optional[str] = None
    apellidos: Optional[str] = None
    ano_nacimiento: Optional[int] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    profile_image_url: Optional[str] = None

class RegistroCreate(BaseModel):
    username:str
    password:str
    nombres:str
    apellidos:str

    email: EmailStr 
    tipo_usuario: str  # estudiante, profesor, empresa

class LoginUsuario(BaseModel):
    username:str
    password:str

class UsuarioResponse(BaseModel):
    identificador: int 
    username: str
    nombres: str
    apellidos: str
    email: EmailStr
    email_verified: bool
    numero_identificacion: str | None = None
    ciudad: str | None = None
    rh: str | None = None
    grupo_sanguineo: str | None = None
    ano_nacimiento: int | None = None
    direccion: str | None = None
    telefono: str | None = None
    profile_image_url: str | None = None
    tipo_usuario: str

    class Config:
        from_attributes = True

class ClaseBase(BaseModel):
    dia: str
    hora: str
    tema: str
    meet_link: Optional[str] = None

class ClaseCreate(ClaseBase):
    profesor_username: str
    estudiantes: Optional[List[str]] = []

class EstudianteEnClase(BaseModel):
    identificador: int
    username: str
    nombres: str
    apellidos: str

    class Config:
        from_attributes = True

class ClaseResponse(ClaseBase):
    id: int
    profesor_username: str
    profesor_nombres: str | None = None
    profesor_apellidos: str | None = None
    estudiantes: List[EstudianteEnClase] = []
    class Config:
        from_attributes = True



