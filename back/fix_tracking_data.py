#!/usr/bin/env python3
"""
Script para diagnosticar y crear datos de prueba necesarios para el tracking.
Soluciona el error de foreign key en actividad_estudiante.
"""

import mysql.connector
from datetime import datetime

# Configuración de conexión (igual que Clever_MySQL_conn.py)
config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'academia',
    'port': 3306
}

def main():
    try:
        # Conectar a MySQL
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
        
        print("=== DIAGNÓSTICO ===")
        
        # 1. Verificar unidades existentes
        cursor.execute("SELECT id, nombre FROM unidad ORDER BY id")
        unidades = cursor.fetchall()
        print(f"Unidades existentes: {len(unidades)}")
        for unidad in unidades:
            print(f"  - ID: {unidad[0]}, Nombre: {unidad[1]}")
        
        # 2. Verificar estudiante 'sebastian'
        cursor.execute("SELECT username, identificador FROM estudiante WHERE username = 'sebastian'")
        estudiante = cursor.fetchone()
        if estudiante:
            print(f"Usuario 'sebastian' existe: ID {estudiante[1]}")
        else:
            print("Usuario 'sebastian' NO existe")
        
        print("\n=== SOLUCIÓN ===")
        
        # 3. Crear unidad de prueba si no existe id=1
        cursor.execute("SELECT id FROM unidad WHERE id = 1")
        if not cursor.fetchone():
            print("Creando unidad con id=1...")
            cursor.execute("""
                INSERT INTO unidad (id, nombre, descripcion, orden)
                VALUES (1, 'Unidad 1 - Básico', 'Unidad básica para tracking', 1)
            """)
            print("✓ Unidad 1 creada")
        else:
            print("✓ Unidad 1 ya existe")
        
        # 4. Crear usuario 'sebastian' si no existe
        if not estudiante:
            print("Creando usuario 'sebastian'...")
            # Obtener el próximo identificador disponible
            cursor.execute("SELECT MAX(identificador) FROM estudiante")
            max_id = cursor.fetchone()[0] or 0
            nuevo_id = max_id + 1
            
            cursor.execute("""
                INSERT INTO estudiante (identificador, username, password, email, rol, matricula_activa)
                VALUES (%s, 'sebastian', 'password123', 'sebastian@test.com', 'estudiante', TRUE)
            """, (nuevo_id,))
            print(f"✓ Usuario 'sebastian' creado con ID {nuevo_id}")
        else:
            print("✓ Usuario 'sebastian' ya existe")
        
        # 5. Crear relación estudiante-unidad si no existe
        if estudiante:
            estudiante_id = estudiante[1]
        else:
            cursor.execute("SELECT identificador FROM estudiante WHERE username = 'sebastian'")
            estudiante_id = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT * FROM estudiante_unidad 
            WHERE estudiante_id = %s AND unidad_id = 1
        """, (estudiante_id,))
        
        if not cursor.fetchone():
            print("Creando relación estudiante-unidad...")
            cursor.execute("""
                INSERT INTO estudiante_unidad (estudiante_id, unidad_id, habilitada)
                VALUES (%s, 1, TRUE)
            """, (estudiante_id,))
            print("✓ Relación estudiante-unidad creada")
        else:
            print("✓ Relación estudiante-unidad ya existe")
        
        # Confirmar cambios
        conn.commit()
        
        print("\n=== VERIFICACIÓN FINAL ===")
        cursor.execute("SELECT id, nombre FROM unidad WHERE id = 1")
        unidad = cursor.fetchone()
        print(f"Unidad 1: {unidad}")
        
        cursor.execute("SELECT username FROM estudiante WHERE username = 'sebastian'")
        user = cursor.fetchone()
        print(f"Usuario sebastian: {user}")
        
        print("\n✅ Datos de prueba listos. El tracking debería funcionar ahora.")
        
    except mysql.connector.Error as e:
        print(f"❌ Error MySQL: {e}")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    main()
