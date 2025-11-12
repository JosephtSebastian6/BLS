#!/usr/bin/env python3
"""
Script para ejecutar la migración de estudiante_quiz_permiso
Crea la tabla automáticamente usando SQLAlchemy
"""

from Clever_MySQL_conn import Base, engine
import models

def run_migration():
    """Crea todas las tablas definidas en models.py si no existen"""
    print("🔄 Ejecutando migración...")
    print("📋 Creando tabla estudiante_quiz_permiso...")
    
    try:
        # Esto creará todas las tablas que no existan, incluyendo estudiante_quiz_permiso
        Base.metadata.create_all(bind=engine)
        print("✅ Migración completada exitosamente")
        print("✅ Tabla estudiante_quiz_permiso creada")
    except Exception as e:
        print(f"❌ Error en la migración: {e}")
        raise

if __name__ == "__main__":
    run_migration()
