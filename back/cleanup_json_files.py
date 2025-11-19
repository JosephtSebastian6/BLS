#!/usr/bin/env python3
"""
Script para limpiar archivos .meta.json innecesarios
===================================================

Este script elimina todos los archivos .meta.json que se crearon automáticamente
al subir tareas. Estos archivos ya no son necesarios porque:

1. El sistema usa la fecha de modificación del archivo como fallback
2. El nuevo sistema de calificaciones V2 maneja la metadata de manera más eficiente
3. Confunden a los usuarios al aparecer junto a sus tareas

IMPORTANTE: Este script es seguro de ejecutar porque el código tiene fallbacks.
"""

import os
from pathlib import Path
import json
from datetime import datetime

def cleanup_meta_json_files(base_dir: str, dry_run: bool = True):
    """
    Elimina archivos .meta.json de las carpetas de estudiantes
    
    Args:
        base_dir: Directorio base donde buscar archivos
        dry_run: Si True, solo muestra qué archivos se eliminarían sin eliminarlos
    """
    base_path = Path(base_dir)
    
    if not base_path.exists():
        print(f"❌ Directorio no encontrado: {base_dir}")
        return
    
    print(f"🔍 Buscando archivos .meta.json en: {base_path}")
    print(f"{'🧪 SIMULACIÓN' if dry_run else '🗑️ ELIMINACIÓN REAL'}")
    print("=" * 60)
    
    meta_files_found = []
    
    # Buscar recursivamente todos los archivos .meta.json
    for meta_file in base_path.rglob("*.meta.json"):
        meta_files_found.append(meta_file)
    
    if not meta_files_found:
        print("✅ No se encontraron archivos .meta.json")
        return
    
    print(f"📊 Encontrados {len(meta_files_found)} archivos .meta.json")
    print()
    
    # Agrupar por estudiante/unidad para mejor visualización
    by_student = {}
    for meta_file in meta_files_found:
        try:
            # Extraer información del path
            parts = meta_file.parts
            if 'estudiantes' in parts:
                student_idx = parts.index('estudiantes') + 1
                if student_idx < len(parts):
                    student = parts[student_idx]
                    if student not in by_student:
                        by_student[student] = []
                    by_student[student].append(meta_file)
        except Exception:
            # Si no podemos parsear el path, agregarlo a "otros"
            if "otros" not in by_student:
                by_student["otros"] = []
            by_student["otros"].append(meta_file)
    
    # Mostrar resumen por estudiante
    for student, files in by_student.items():
        print(f"👤 {student}: {len(files)} archivos .meta.json")
        for file in files[:3]:  # Mostrar solo los primeros 3
            print(f"   📄 {file.name}")
        if len(files) > 3:
            print(f"   ... y {len(files) - 3} más")
        print()
    
    if dry_run:
        print("🧪 SIMULACIÓN - No se eliminó ningún archivo")
        print("💡 Para eliminar realmente, ejecuta: python cleanup_json_files.py --real")
        return
    
    # Eliminar archivos
    deleted_count = 0
    errors = []
    
    for meta_file in meta_files_found:
        try:
            # Leer contenido antes de eliminar (para log)
            try:
                with open(meta_file, 'r', encoding='utf-8') as f:
                    content = json.load(f)
                original_name = content.get('original_name', 'desconocido')
            except Exception:
                original_name = 'desconocido'
            
            # Eliminar archivo
            meta_file.unlink()
            deleted_count += 1
            print(f"🗑️ Eliminado: {meta_file.name} (original: {original_name})")
            
        except Exception as e:
            error_msg = f"❌ Error eliminando {meta_file}: {e}"
            errors.append(error_msg)
            print(error_msg)
    
    print()
    print("=" * 60)
    print(f"✅ Archivos eliminados: {deleted_count}")
    if errors:
        print(f"❌ Errores: {len(errors)}")
        for error in errors:
            print(f"   {error}")
    else:
        print("🎉 ¡Limpieza completada sin errores!")

def main():
    """Función principal"""
    import sys
    
    # Directorio base donde están los archivos de estudiantes
    base_dir = "/Users/sena/Desktop/Ingles/archivos_estudiantes"
    
    # Verificar si se quiere ejecutar realmente o solo simular
    dry_run = True
    if len(sys.argv) > 1 and sys.argv[1] == "--real":
        dry_run = False
        print("⚠️ MODO REAL - Los archivos serán eliminados permanentemente")
        response = input("¿Estás seguro? (escribe 'SI' para confirmar): ")
        if response != "SI":
            print("❌ Operación cancelada")
            return
    
    print("🧹 Script de Limpieza de Archivos .meta.json")
    print("=" * 50)
    print(f"📅 Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    cleanup_meta_json_files(base_dir, dry_run)

if __name__ == "__main__":
    main()
