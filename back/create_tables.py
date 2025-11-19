#!/usr/bin/env python3
"""
Script para crear las nuevas tablas necesarias para el sistema de respuestas de evaluaciones
"""

from Clever_MySQL_conn import engine, Base
import models

def create_tables():
    """Crear todas las tablas definidas en los modelos"""
    try:
        print("Creando tablas...")
        Base.metadata.create_all(bind=engine)
        print("✅ Tablas creadas exitosamente")
        
        # Mostrar las tablas que se crearon
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"📋 Tablas disponibles: {', '.join(tables)}")
        
    except Exception as e:
        print(f"❌ Error al crear tablas: {e}")

if __name__ == "__main__":
    create_tables()
