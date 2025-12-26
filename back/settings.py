from __future__ import annotations
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# Cargar variables de entorno desde .env (si existe)
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

@dataclass
class Settings:
    # Seguridad JWT
    SECRET_KEY: str = field(default_factory=lambda: os.getenv("SECRET_KEY", "supersecretkey"))
    ALGORITHM: str = field(default_factory=lambda: os.getenv("ALGORITHM", "HS256"))
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    # Orígenes permitidos para CORS
    ALLOWED_ORIGINS: List[str] = field(default_factory=list)

    # Email/Templates
    TEMPLATE_FOLDER: Path = field(default_factory=lambda: BASE_DIR / "templates")

    # Calificaciones (pesos y umbrales)
    GRADES_WT_TAREAS: float = field(default_factory=lambda: float(os.getenv("GRADES_WT_TAREAS", "0.6")))
    GRADES_WT_QUIZ: float = field(default_factory=lambda: float(os.getenv("GRADES_WT_QUIZ", "0.3")))
    GRADES_WT_TIEMPO: float = field(default_factory=lambda: float(os.getenv("GRADES_WT_TIEMPO", "0.1")))
    GRADES_OBJETIVO_MIN: int = field(default_factory=lambda: int(os.getenv("GRADES_OBJETIVO_MIN", "120")))
    GRADES_UMBRAL_APROBACION: int = field(default_factory=lambda: int(os.getenv("GRADES_UMBRAL_APROBACION", "60")))

    def __post_init__(self):
        # Construir ALLOWED_ORIGINS por defecto si no vienen de env
        env_origins = os.getenv("ALLOWED_ORIGINS")
        if env_origins:
            # Separados por coma
            origins = [o.strip() for o in env_origins.split(",") if o.strip()]
        else:
            origins = [
                # Dominios locales comunes (web)
                "http://localhost",
                "http://localhost:3000",
                "http://localhost:4200",
                "http://localhost:8080",
                "http://127.0.0.1",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:4200",
                # Android Emulator (host desde emulador)
                "http://10.0.2.2",
                "http://10.0.2.2:3000",
                "http://10.0.2.2:4200",
                # Si usas webviews/túneles agrega aquí
                "http://localhost.tiangolo.com",
                "https://localhost.tiangolo.com",
            ]

        # Asegurar siempre el dominio del frontend en Render
        extra_origins = [
            "https://bls-front.onrender.com",
        ]
        for origin in extra_origins:
            if origin not in origins:
                origins.append(origin)

        self.ALLOWED_ORIGINS = origins

settings = Settings()
