#!/usr/bin/env python3
"""
Script para diagnosticar el problema de acceso 403 en subida de archivos
"""

import mysql.connector
from datetime import datetime

# Configuración de conexión
config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'academia',
    'port': 3306
}

def main():
    try:
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
        
        print("=== DIAGNÓSTICO DE ACCESO ===")
        
        # 1. Verificar usuario sebastian
        cursor.execute("SELECT identificador, username, tipo_usuario FROM estudiante WHERE username = 'sebastian'")
        estudiante = cursor.fetchone()
        if estudiante:
            print(f"✅ Usuario sebastian encontrado: ID={estudiante[0]}, tipo={estudiante[2]}")
        else:
            print("❌ Usuario sebastian NO encontrado")
            return
        
        # 2. Verificar unidad 1
        cursor.execute("SELECT id, nombre FROM unidad WHERE id = 1")
        unidad = cursor.fetchone()
        if unidad:
            print(f"✅ Unidad 1 encontrada: {unidad[1]}")
        else:
            print("❌ Unidad 1 NO encontrada")
            return
        
        # 3. Verificar relación estudiante_unidad
        cursor.execute("""
            SELECT estudiante_id, unidad_id, habilitada 
            FROM estudiante_unidad 
            WHERE estudiante_id = %s AND unidad_id = 1
        """, (estudiante[0],))
        
        relacion = cursor.fetchone()
        if relacion:
            print(f"✅ Relación encontrada: estudiante_id={relacion[0]}, unidad_id={relacion[1]}, habilitada={relacion[2]}")
            if relacion[2]:
                print("✅ Acceso HABILITADO")
            else:
                print("❌ Acceso DESHABILITADO")
        else:
            print("❌ NO existe relación estudiante_unidad")
            print("Creando relación...")
            cursor.execute("""
                INSERT INTO estudiante_unidad (estudiante_id, unidad_id, habilitada)
                VALUES (%s, 1, TRUE)
            """, (estudiante[0],))
            conn.commit()
            print("✅ Relación creada")
        
        # 4. Verificar todas las relaciones del estudiante
        cursor.execute("""
            SELECT unidad_id, habilitada 
            FROM estudiante_unidad 
            WHERE estudiante_id = %s
        """, (estudiante[0],))
        
        todas_relaciones = cursor.fetchall()
        print(f"\n📋 Todas las relaciones del estudiante:")
        for rel in todas_relaciones:
            estado = "HABILITADA" if rel[1] else "DESHABILITADA"
            print(f"  - Unidad {rel[0]}: {estado}")
        
        print("\n=== RESULTADO ===")
        if relacion and relacion[2]:
            print("✅ El estudiante DEBERÍA tener acceso a subir archivos")
        else:
            print("❌ El estudiante NO tiene acceso")
        
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
