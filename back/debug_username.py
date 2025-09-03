#!/usr/bin/env python3
"""
Script para verificar qué username está llegando al backend desde el dashboard de estudiante
"""

import mysql.connector
from datetime import datetime

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
        
        print("=== VERIFICANDO DATOS DE ANALYTICS ===\n")
        
        # 1. Ver todos los usernames en estudiante_progreso_unidad
        cursor.execute("""
            SELECT DISTINCT username, COUNT(*) as registros
            FROM estudiante_progreso_unidad 
            GROUP BY username
            ORDER BY username
        """)
        usernames_progreso = cursor.fetchall()
        print("📊 Usernames en estudiante_progreso_unidad:")
        for user, count in usernames_progreso:
            print(f"  - '{user}': {count} registros")
        
        # 2. Ver todos los usernames en actividad_estudiante
        cursor.execute("""
            SELECT DISTINCT username, COUNT(*) as eventos
            FROM actividad_estudiante 
            GROUP BY username
            ORDER BY username
        """)
        usernames_actividad = cursor.fetchall()
        print(f"\n📈 Usernames en actividad_estudiante:")
        for user, count in usernames_actividad:
            print(f"  - '{user}': {count} eventos")
        
        # 3. Ver datos específicos para 'sebastian'
        cursor.execute("""
            SELECT unidad_id, porcentaje_completado, score, tiempo_dedicado_min
            FROM estudiante_progreso_unidad 
            WHERE username = 'sebastian'
            ORDER BY unidad_id
        """)
        sebastian_data = cursor.fetchall()
        print(f"\n🔍 Datos específicos para 'sebastian':")
        if sebastian_data:
            total_tiempo = sum([row[3] or 0 for row in sebastian_data])
            total_progreso = sum([row[1] or 0 for row in sebastian_data]) / len(sebastian_data)
            unidades_completadas = len([row for row in sebastian_data if row[1] == 100])
            
            print(f"  - Total unidades: {len(sebastian_data)}")
            print(f"  - Tiempo total: {total_tiempo} min")
            print(f"  - Progreso promedio: {total_progreso:.1f}%")
            print(f"  - Unidades completadas: {unidades_completadas}")
            
            for row in sebastian_data:
                print(f"    * Unidad {row[0]}: {row[1]}% completado, score {row[2]}, {row[3]} min")
        else:
            print("  ❌ NO hay datos para 'sebastian'")
        
        # 4. Verificar si hay otros usernames similares
        cursor.execute("""
            SELECT DISTINCT username 
            FROM estudiante 
            WHERE username LIKE '%sebastian%' OR username LIKE '%Sebastian%'
        """)
        similar_users = cursor.fetchall()
        print(f"\n🔍 Usernames similares a 'sebastian' en tabla estudiante:")
        for user in similar_users:
            print(f"  - '{user[0]}'")
        
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
