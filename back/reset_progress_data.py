#!/usr/bin/env python3
"""
Script para resetear los datos de progreso a 0 y mantener solo el tiempo real de tracking
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
        
        username = 'sebastian'
        
        print("🔄 Reseteando datos de progreso para empezar con datos reales...")
        
        # 1. Resetear porcentaje_completado y score a 0, mantener tiempo real
        cursor.execute("""
            UPDATE estudiante_progreso_unidad 
            SET porcentaje_completado = 0, 
                score = 0,
                ultima_actividad_at = NOW()
            WHERE username = %s
        """, (username,))
        
        # 2. Eliminar unidades de prueba que no corresponden al tracking real
        # Mantener solo las unidades donde realmente hay actividad de tracking
        cursor.execute("""
            SELECT DISTINCT unidad_id 
            FROM actividad_estudiante 
            WHERE username = %s
        """, (username,))
        unidades_con_tracking = [row[0] for row in cursor.fetchall()]
        
        if unidades_con_tracking:
            placeholders = ','.join(['%s'] * len(unidades_con_tracking))
            cursor.execute(f"""
                DELETE FROM estudiante_progreso_unidad 
                WHERE username = %s AND unidad_id NOT IN ({placeholders})
            """, [username] + unidades_con_tracking)
        
        conn.commit()
        
        # 3. Verificar estado final
        cursor.execute("""
            SELECT unidad_id, porcentaje_completado, score, tiempo_dedicado_min
            FROM estudiante_progreso_unidad 
            WHERE username = %s
            ORDER BY unidad_id
        """, (username,))
        
        resultados = cursor.fetchall()
        print(f"\n✅ Datos reseteados para '{username}':")
        
        if resultados:
            for row in resultados:
                print(f"  - Unidad {row[0]}: {row[1]}% completado, score {row[2]}, {row[3]} min")
        else:
            print("  - No hay registros de progreso (se crearán automáticamente con el tracking)")
        
        # 4. Mostrar actividad de tracking real
        cursor.execute("""
            SELECT unidad_id, COUNT(*) as eventos, 
                   MIN(creado_at) as primer_evento, 
                   MAX(creado_at) as ultimo_evento
            FROM actividad_estudiante 
            WHERE username = %s
            GROUP BY unidad_id
            ORDER BY unidad_id
        """, (username,))
        
        tracking_data = cursor.fetchall()
        print(f"\n📊 Actividad de tracking real:")
        for row in tracking_data:
            print(f"  - Unidad {row[0]}: {row[1]} eventos, desde {row[2]} hasta {row[3]}")
        
        print(f"\n🎯 Dashboard listo para mostrar datos reales de tracking")
        
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
