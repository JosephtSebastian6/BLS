#!/usr/bin/env python3
"""
Script de debugging para el sistema de calificación de quizzes
============================================================

Este script ayuda a identificar por qué las evaluaciones están dando 0/100
a pesar de responder correctamente.
"""

import json
from sqlalchemy.orm import Session
from database import get_db
import models

def debug_quiz_structure():
    """Examina la estructura de los quizzes en la base de datos"""
    print("🔍 DEBUG: Examinando estructura de quizzes en la BD")
    print("=" * 60)
    
    db = next(get_db())
    
    try:
        # Obtener todos los quizzes
        quizzes = db.query(models.Quiz).all()
        
        print(f"📊 Total de quizzes encontrados: {len(quizzes)}")
        print()
        
        for i, quiz in enumerate(quizzes[:3]):  # Solo los primeros 3
            print(f"📝 Quiz {i+1}:")
            print(f"  - ID: {quiz.id}")
            print(f"  - Título: {quiz.titulo}")
            print(f"  - Unidad ID: {quiz.unidad_id}")
            print(f"  - Descripción: {quiz.descripcion}")
            print(f"  - Tipo de preguntas: {type(quiz.preguntas)}")
            
            if quiz.preguntas:
                print(f"  - Estructura de preguntas:")
                if isinstance(quiz.preguntas, dict):
                    print(f"    * Es dict con keys: {list(quiz.preguntas.keys())}")
                    
                    # Intentar diferentes estructuras
                    if 'preguntas' in quiz.preguntas:
                        preguntas_lista = quiz.preguntas['preguntas']
                        print(f"    * Encontrado 'preguntas' key con {len(preguntas_lista)} items")
                        
                        # Examinar primera pregunta
                        if preguntas_lista and len(preguntas_lista) > 0:
                            primera = preguntas_lista[0]
                            print(f"    * Primera pregunta estructura: {primera}")
                            if isinstance(primera, dict):
                                print(f"    * Keys de primera pregunta: {list(primera.keys())}")
                    
                    elif 'items' in quiz.preguntas:
                        items_lista = quiz.preguntas['items']
                        print(f"    * Encontrado 'items' key con {len(items_lista)} items")
                        
                elif isinstance(quiz.preguntas, list):
                    print(f"    * Es lista directa con {len(quiz.preguntas)} items")
                    if quiz.preguntas:
                        primera = quiz.preguntas[0]
                        print(f"    * Primera pregunta: {primera}")
                
                print(f"  - JSON completo: {json.dumps(quiz.preguntas, indent=2, ensure_ascii=False)}")
            else:
                print(f"  - ⚠️ Sin preguntas definidas")
            
            print()
        
        # Examinar respuestas de estudiantes
        print("👥 Examinando respuestas de estudiantes:")
        print("-" * 40)
        
        respuestas = db.query(models.EstudianteQuizRespuesta).limit(3).all()
        
        for i, resp in enumerate(respuestas):
            print(f"📋 Respuesta {i+1}:")
            print(f"  - ID: {resp.id}")
            print(f"  - Estudiante: {resp.estudiante_username}")
            print(f"  - Quiz ID: {resp.quiz_id}")
            print(f"  - Score: {resp.score}")
            print(f"  - Respuestas: {resp.respuestas}")
            print()
    
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

def simulate_quiz_scoring():
    """Simula el cálculo de puntaje con datos de ejemplo"""
    print("🧮 SIMULACIÓN: Cálculo de puntaje")
    print("=" * 40)
    
    # Ejemplo de estructura de quiz típica
    ejemplo_quiz = {
        "preguntas": [
            {
                "enunciado": "¿Cuál es la capital de Francia?",
                "tipo": "opcion_multiple",
                "opciones": [
                    {"texto": "Madrid"},
                    {"texto": "París"},
                    {"texto": "Londres"},
                    {"texto": "Roma"}
                ],
                "respuesta_correcta": 1  # París (índice 1)
            },
            {
                "enunciado": "El agua hierve a 100°C",
                "tipo": "vf",
                "respuesta_correcta": True
            }
        ]
    }
    
    # Ejemplo de respuestas del estudiante
    respuestas_correctas = {
        "pregunta_0": 1,  # París
        "pregunta_1": True  # Verdadero
    }
    
    respuestas_incorrectas = {
        "pregunta_0": 0,  # Madrid (incorrecto)
        "pregunta_1": False  # Falso (incorrecto)
    }
    
    print("📝 Quiz de ejemplo:")
    print(json.dumps(ejemplo_quiz, indent=2, ensure_ascii=False))
    print()
    
    print("✅ Respuestas correctas:")
    print(json.dumps(respuestas_correctas, indent=2))
    
    # Simular cálculo
    from auth_routes import calcular_puntaje_quiz
    
    puntaje_correcto = calcular_puntaje_quiz(ejemplo_quiz, respuestas_correctas)
    print(f"🎯 Puntaje con respuestas correctas: {puntaje_correcto}/100")
    print()
    
    print("❌ Respuestas incorrectas:")
    print(json.dumps(respuestas_incorrectas, indent=2))
    
    puntaje_incorrecto = calcular_puntaje_quiz(ejemplo_quiz, respuestas_incorrectas)
    print(f"🎯 Puntaje con respuestas incorrectas: {puntaje_incorrecto}/100")

def check_recent_quiz_attempts():
    """Revisa los intentos recientes de quiz para debugging"""
    print("🕐 REVISIÓN: Intentos recientes de quiz")
    print("=" * 45)
    
    db = next(get_db())
    
    try:
        # Obtener las 5 respuestas más recientes
        respuestas_recientes = (
            db.query(models.EstudianteQuizRespuesta)
            .order_by(models.EstudianteQuizRespuesta.created_at.desc())
            .limit(5)
            .all()
        )
        
        for i, resp in enumerate(respuestas_recientes):
            print(f"📋 Intento {i+1} (ID: {resp.id}):")
            print(f"  - Estudiante: {resp.estudiante_username}")
            print(f"  - Fecha: {resp.created_at}")
            print(f"  - Score obtenido: {resp.score}/100")
            
            # Obtener el quiz correspondiente
            quiz = db.query(models.Quiz).filter(models.Quiz.id == resp.quiz_id).first()
            if quiz:
                print(f"  - Quiz: '{quiz.titulo}'")
                print(f"  - Respuestas del estudiante: {resp.respuestas}")
                
                # Simular recálculo
                if quiz.preguntas:
                    print(f"  - Recalculando puntaje...")
                    from auth_routes import calcular_puntaje_quiz
                    puntaje_recalculado = calcular_puntaje_quiz(quiz.preguntas, resp.respuestas)
                    print(f"  - Puntaje recalculado: {puntaje_recalculado}/100")
                    
                    if puntaje_recalculado != resp.score:
                        print(f"  - ⚠️ DISCREPANCIA: BD={resp.score}, Calculado={puntaje_recalculado}")
                    else:
                        print(f"  - ✅ Puntajes coinciden")
            
            print()
    
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

def main():
    """Función principal de debugging"""
    print("🐛 SCRIPT DE DEBUGGING - SISTEMA DE CALIFICACIÓN DE QUIZZES")
    print("=" * 70)
    print()
    
    try:
        # 1. Examinar estructura de quizzes
        debug_quiz_structure()
        print()
        
        # 2. Simular cálculo de puntaje
        simulate_quiz_scoring()
        print()
        
        # 3. Revisar intentos recientes
        check_recent_quiz_attempts()
        
    except Exception as e:
        print(f"❌ Error general: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
