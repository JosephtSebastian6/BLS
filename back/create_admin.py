#!/usr/bin/env python3
"""
Script para crear o actualizar un usuario Administrador directamente en la base de datos.

Uso recomendado (desde la carpeta /back):
  python create_admin.py \
    --username Administrador \
    --password AdministradorBLS \
    --email driveflow900@gmail.com

Si el usuario existe, solo actualizará su contraseña, email y lo marcará como tipo_usuario='admin' y email_verified=True.
"""
from __future__ import annotations

import argparse
from sqlalchemy.orm import Session
from passlib.context import CryptContext

# Módulos del proyecto
from Clever_MySQL_conn import SessionLocal, Base, engine
import models

bcrypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def ensure_tables():
    """Crea las tablas si aún no existen (idempotente)."""
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[ERROR] No fue posible asegurar las tablas: {e}")
        raise


def upsert_admin(db: Session, username: str, password: str, email: str):
    hashed_pw = bcrypt_context.hash(password)

    # Buscar por username primero
    user = db.query(models.Registro).filter(models.Registro.username == username).first()

    if user:
        print(f"[INFO] Usuario '{username}' encontrado. Actualizando a admin…")
        user.hashed_password = hashed_pw
        user.email = email
        user.tipo_usuario = "admin"
        user.email_verified = True
        user.verification_token = None
        user.token_expires_at = None
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"[OK] Usuario '{username}' actualizado como admin.")
        return user

    # Si no existe por username, verificar si existe por email
    user_by_email = db.query(models.Registro).filter(models.Registro.email == email).first()
    if user_by_email:
        print(f"[INFO] Ya existe un usuario con email {email}. Actualizando a admin…")
        user_by_email.hashed_password = hashed_pw
        user_by_email.username = username
        user_by_email.tipo_usuario = "admin"
        user_by_email.email_verified = True
        user_by_email.verification_token = None
        user_by_email.token_expires_at = None
        db.add(user_by_email)
        db.commit()
        db.refresh(user_by_email)
        print(f"[OK] Usuario '{username}' (por email) actualizado como admin.")
        return user_by_email

    # Crear uno nuevo
    print(f"[INFO] Creando usuario admin '{username}' …")
    nuevo = models.Registro(
        username=username,
        hashed_password=hashed_pw,
        nombres="Administrador",
        apellidos="BLS",
        email=email,
        email_verified=True,
        verification_token=None,
        tipo_usuario="admin",
        token_expires_at=None,
        matricula_activa=True,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    print(f"[OK] Admin '{username}' creado con éxito (ID={nuevo.identificador}).")
    return nuevo


def main():
    parser = argparse.ArgumentParser(description="Crear/actualizar usuario Administrador")
    parser.add_argument("--username", default="Administrador", help="Username del admin")
    parser.add_argument("--password", default="AdministradorBLS", help="Contraseña del admin")
    parser.add_argument("--email", default="driveflow900@gmail.com", help="Email del admin")
    args = parser.parse_args()

    ensure_tables()

    with SessionLocal() as db:
        upsert_admin(db, username=args.username, password=args.password, email=args.email)


if __name__ == "__main__":
    main()
