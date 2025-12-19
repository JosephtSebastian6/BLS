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
    matricula_activa: bool | None = None

    class Config:
        from_attributes = True

class ClaseBase(BaseModel):
    dia: str
    hora: str
    tema: str
    meet_link: Optional[str] = None
    unidad_id: Optional[int] = None

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


# ===== Quizzes =====
class QuizCreate(BaseModel):
    unidad_id: int
    titulo: str
    descripcion: Optional[str] = None
    preguntas: Optional[dict] = None  # estructura libre por ahora

class QuizResponse(BaseModel):
    id: int
    unidad_id: int
    titulo: str
    descripcion: Optional[str] = None
    preguntas: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ===== Asignaciones de Quiz =====
class QuizAsignacionCreate(BaseModel):
    unidad_id: int
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    max_intentos: Optional[int] = None
    tiempo_limite_minutos: Optional[int] = None

class QuizAsignacionResponse(BaseModel):
    id: int
    quiz_id: int
    unidad_id: int
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    created_at: datetime
    max_intentos: Optional[int] = None
    tiempo_limite_minutos: Optional[int] = None

    class Config:
        from_attributes = True


# ===== Respuestas de Quiz =====
class QuizRespuestaCreate(BaseModel):
    quiz_id: int
    respuestas: dict  # {"pregunta_1": "respuesta_a", "pregunta_2": "respuesta_b", ...}

class QuizRespuestaResponse(BaseModel):
    id: int
    estudiante_username: str
    quiz_id: int
    unidad_id: int
    respuestas: dict
    score: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ===== Quiz Detallado para Estudiante =====
class QuizDetalleEstudiante(BaseModel):
    id: int
    unidad_id: int
    titulo: str
    descripcion: Optional[str] = None
    preguntas: Optional[dict] = None
    ya_respondido: bool = False
    calificacion: Optional[int] = None
    fecha_respuesta: Optional[datetime] = None
    intentos_realizados: Optional[int] = None
    max_intentos: Optional[int] = None
    puede_intentar: Optional[bool] = None
    tiempo_limite_minutos: Optional[int] = None
    aprobada: Optional[bool] = None
    aprobada_at: Optional[datetime] = None
    origen_manual: Optional[bool] = None
    comentario_profesor: Optional[str] = None

    class Config:
        from_attributes = True

