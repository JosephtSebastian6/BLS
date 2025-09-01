#!/usr/bin/env python3
"""
Script para agregar la columna matricula_activa a la tabla estudiante
"""
import mysql.connector
from config import conf

def add_matricula_column():
    try:
        # Conectar a la base de datos
        connection = mysql.connector.connect(
            host=conf.DB_HOST,
            user=conf.DB_USER,
            password=conf.DB_PASSWORD,
            database=conf.DB_NAME
        )
        
        cursor = connection.cursor()
        
        # Verificar si la columna ya existe
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = %s 
            AND TABLE_NAME = 'estudiante' 
            AND COLUMN_NAME = 'matricula_activa'
        """, (conf.DB_NAME,))
        
        if cursor.fetchone():
            print("La columna 'matricula_activa' ya existe.")
            return
        
        # Agregar la columna
        cursor.execute("""
            ALTER TABLE estudiante 
            ADD COLUMN matricula_activa BOOLEAN DEFAULT TRUE
        """)
        
        connection.commit()
        print("Columna 'matricula_activa' agregada exitosamente.")
        
    except mysql.connector.Error as error:
        print(f"Error al agregar la columna: {error}")
        
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

if __name__ == "__main__":
    add_matricula_column()
