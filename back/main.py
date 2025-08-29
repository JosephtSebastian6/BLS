from typing import Union
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth_routes import authRouter  # <--- CAMBIO AQUÍ: Importación relativa
from config import conf
#from fastapi_mail import FastMail



print(f"DEBUG: conf.TEMPLATE_FOLDER = {conf.TEMPLATE_FOLDER}")
print(f"DEBUG: conf.TEMPLATE_FOLDER.is_dir() = {conf.TEMPLATE_FOLDER.is_dir()}")
print(f"DEBUG: Type of conf = {type(conf)}")

#fm = FastMail(conf)

AcademyEnApp = FastAPI()
# Registra el router de autenticación
AcademyEnApp.include_router(authRouter, prefix="/auth", tags=["Auth"]) # <--- DEBE SER ASÍ

# Elimina esta línea si ya load_dotenv() se llama en config.py
# load_dotenv() # Carga las variables de entorno de .env


origins =[
    "http://localhost.tiangolo.com",
    "https://localhost.tiangolo.com",
    "http://localhost",
    "http://localhost:8080",
    "http://localhost:3000",
    "http://localhost:4200",
    "http://localhost:60891",
]

# Configuración del middleware CORS para permitir peticiones desde frontend
AcademyEnApp.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ruta raíz para probar que el backend funciona
@AcademyEnApp.get("/")
async def read_root():
    return {"Hello": "World"}

# Ruta para obtener parámetros en la ruta (ej: /items/5)
@AcademyEnApp.get("/items/{item_id}")
async def read_paramInPath_item(item_id: int):
    return {"item_id": item_id}

# Ruta que combina parámetros de ruta y de query (ej: /items/5?q=texto)
@AcademyEnApp.get("/items/{item_id}")
async def read_both_paramTypes_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}
    
# Ruta para eliminar un ítem por ID (simulación)
@AcademyEnApp.delete("/items_del/{item_id}")
async def delete_by_id(item_id: int):
    return {"resultado": "Se ha eliminado correctamente el item solicitado"}
