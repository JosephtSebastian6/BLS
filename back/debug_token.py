#!/usr/bin/env python3
"""
Script para diagnosticar problemas de autenticación JWT
"""

import mysql.connector
from datetime import datetime
import json
import base64

# Configuración de conexión
config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'academia',
    'port': 3306
}

# Clave secreta (debe coincidir con auth_routes.py)
SECRET_KEY = "supersecretkey"
ALGORITHM = "HS256"

def main():
    try:
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
        
        print("=== DIAGNÓSTICO DE TOKEN JWT ===")
        
        # 1. Generar token para sebastian
        payload = {
            "sub": "sebastian",
            "exp": datetime.utcnow().timestamp() + 3600  # 1 hora
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        print(f"✅ Token generado para sebastian:")
        print(f"   {token[:50]}...")
        
        # 2. Verificar que el token se puede decodificar
        try:
            decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            print(f"✅ Token válido - usuario: {decoded['sub']}")
        except jwt.JWTError as e:
            print(f"❌ Token inválido: {e}")
            return
        
        # 3. Verificar datos del usuario
        cursor.execute("SELECT identificador, username, tipo_usuario FROM estudiante WHERE username = 'sebastian'")
        estudiante = cursor.fetchone()
        if estudiante:
            print(f"✅ Usuario en DB: ID={estudiante[0]}, tipo={estudiante[2]}")
        else:
            print("❌ Usuario no encontrado en DB")
            return
        
        # 4. Verificar acceso a unidad 1
        cursor.execute("""
            SELECT estudiante_id, unidad_id, habilitada 
            FROM estudiante_unidad 
            WHERE estudiante_id = %s AND unidad_id = 1
        """, (estudiante[0],))
        
        acceso = cursor.fetchone()
        if acceso and acceso[2]:
            print(f"✅ Acceso a unidad 1: HABILITADO")
        else:
            print(f"❌ Acceso a unidad 1: {'DESHABILITADO' if acceso else 'NO EXISTE'}")
        
        print(f"\n📋 INSTRUCCIONES:")
        print(f"1. Copia este token en localStorage del navegador:")
        print(f"   localStorage.setItem('token', '{token}');")
        print(f"2. O también:")
        print(f"   localStorage.setItem('access_token', '{token}');")
        print(f"3. Recarga la página y prueba subir archivo")
        
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
