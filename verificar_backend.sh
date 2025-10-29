#!/bin/bash
# Script para verificar que el backend funcione correctamente

echo "=== Verificando instalación de dependencias ==="
cd /Users/sena/Desktop/Ingles
source entornoIngles/bin/activate

echo "Python version:"
python --version

echo ""
echo "Verificando importaciones críticas:"
python -c "
try:
    from pathlib import Path
    print('✅ Path importado correctamente')
except ImportError as e:
    print('❌ Error importando Path:', e)

try:
    import sqlalchemy
    print('✅ SQLAlchemy importado correctamente')
except ImportError as e:
    print('❌ Error importando SQLAlchemy:', e)

try:
    from fastapi import FastAPI
    print('✅ FastAPI importado correctamente')
except ImportError as e:
    print('❌ Error importando FastAPI:', e)

try:
    from auth_routes import authRouter
    print('✅ auth_routes importado correctamente')
except ImportError as e:
    print('❌ Error importando auth_routes:', e)

try:
    import crud
    print('✅ crud importado correctamente')
except ImportError as e:
    print('❌ Error importando crud:', e)
"

echo ""
echo "=== Probando conexión a base de datos ==="
python -c "
import os
from dotenv import load_dotenv
load_dotenv('back/.env')

print('Variables de entorno:')
print(f'DB_HOST: {os.getenv(\"DB_HOST\")}')
print(f'DB_USER: {os.getenv(\"DB_USER\")}')
print(f'DB_NAME: {os.getenv(\"DB_NAME\")}')
print(f'SECRET_KEY: {os.getenv(\"SECRET_KEY\")[:10]}...')

try:
    from Clever_MySQL_conn import mysqlConn, engine
    print('✅ Conexión a MySQL configurada')
except Exception as e:
    print('❌ Error en conexión MySQL:', e)
"

echo ""
echo "=== Iniciando servidor FastAPI ==="
echo "Ejecuta este comando para iniciar el servidor:"
echo "cd /Users/sena/Desktop/Ingles && source entornoIngles/bin/activate && cd back && fastapi dev main.py"
