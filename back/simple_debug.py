#!/usr/bin/env python3
"""
Script simple para verificar datos básicos
"""

import mysql.connector

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
        
        print("=== VERIFICACIÓN RÁPIDA ===")
        
        # Verificar usuario sebastian
        cursor.execute("SELECT identificador, username, tipo_usuario FROM estudiante WHERE username = 'sebastian'")
        estudiante = cursor.fetchone()
        if estudiante:
            print(f"✅ Usuario: ID={estudiante[0]}, username={estudiante[1]}, tipo={estudiante[2]}")
            
            # Verificar acceso a unidad 1
            cursor.execute("""
                SELECT habilitada FROM estudiante_unidad 
                WHERE estudiante_id = %s AND unidad_id = 1
            """, (estudiante[0],))
            
            acceso = cursor.fetchone()
            if acceso and acceso[0]:
                print("✅ Acceso a unidad 1: HABILITADO")
                print("\n🔍 El problema es de AUTENTICACIÓN, no de permisos")
                print("📋 SOLUCIÓN:")
                print("1. Abre DevTools (F12) en el navegador")
                print("2. Ve a Console y ejecuta:")
                print("   console.log(localStorage.getItem('token'));")
                print("   console.log(localStorage.getItem('access_token'));")
                print("3. Verifica que hay un token válido")
                print("4. Si no hay token, inicia sesión nuevamente")
            else:
                print("❌ Sin acceso a unidad 1")
        else:
            print("❌ Usuario sebastian no encontrado")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    main()
