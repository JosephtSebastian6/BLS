"""
Rutas Unificadas de Calificaciones
==================================

Endpoints modernos y consistentes para el sistema de calificaciones.
Todos los endpoints usan el GradingService centralizado.
"""

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

from Clever_MySQL_conn import get_db
from grading_service import GradingService
from auth_routes import require_roles, get_current_user_from_token
import models

# Router para calificaciones
grading_router = APIRouter(prefix="/api/v2/grades", tags=["Calificaciones V2"])

# Schemas para requests
class TaskGradeRequest(BaseModel):
    estudiante_username: str = Field(..., description="Username del estudiante")
    unidad_id: int = Field(..., description="ID de la unidad")
    filename: str = Field(..., description="Nombre del archivo de tarea")
    score: int = Field(..., ge=0, le=100, description="Puntuación (0-100)")

class QuizGradeRequest(BaseModel):
    estudiante_username: str = Field(..., description="Username del estudiante")
    unidad_id: int = Field(..., description="ID de la unidad")
    quiz_id: int = Field(..., description="ID del quiz")
    score: int = Field(..., ge=0, le=100, description="Puntuación (0-100)")

class ManualOverrideRequest(BaseModel):
    estudiante_username: str = Field(..., description="Username del estudiante")
    unidad_id: int = Field(..., description="ID de la unidad")
    score: Optional[int] = Field(None, ge=0, le=100, description="Score manual (opcional)")
    aprobado: Optional[bool] = Field(None, description="Estado de aprobación manual (opcional)")

# Endpoints principales

@grading_router.get("/estudiantes/{username}/resumen")
def get_student_grades_summary(
    username: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles(["profesor", "empresa", "admin"]))
):
    """
    Obtiene resumen completo de calificaciones de un estudiante
    
    - **username**: Username del estudiante
    - **Returns**: Resumen completo con todas las unidades y calificaciones
    """
    try:
        grading_service = GradingService(db)
        result = grading_service.get_student_grades_summary(username)
        
        if not result.get("success", True):
            raise HTTPException(status_code=500, detail=result.get("error", "Error desconocido"))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo resumen de calificaciones: {e}")

@grading_router.get("/estudiantes/{username}/unidades/{unidad_id}")
def get_unit_grade_detail(
    username: str,
    unidad_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles(["profesor", "empresa", "admin"]))
):
    """
    Obtiene calificación detallada de una unidad específica
    
    - **username**: Username del estudiante
    - **unidad_id**: ID de la unidad
    - **Returns**: Calificación detallada con todos los componentes
    """
    try:
        grading_service = GradingService(db)
        result = grading_service.calculate_unit_grade(username, unidad_id)
        
        if result.get("error"):
            raise HTTPException(status_code=500, detail="Error calculando calificación de unidad")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo calificación de unidad: {e}")

@grading_router.post("/tareas")
def update_task_grade(
    request: TaskGradeRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles(["profesor", "empresa", "admin"]))
):
    """
    Actualiza calificación de una tarea
    
    - **request**: Datos de la calificación de tarea
    - **Returns**: Resultado de la operación y calificación actualizada
    """
    try:
        grading_service = GradingService(db)
        result = grading_service.update_task_grade(
            username=request.estudiante_username,
            unidad_id=request.unidad_id,
            filename=request.filename,
            score=request.score
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Error actualizando calificación"))
        
        # Crear notificación para el estudiante
        try:
            _create_grade_notification(
                db, 
                request.estudiante_username, 
                request.unidad_id, 
                "tarea", 
                request.score,
                current_user.get("username")
            )
        except Exception as e:
            print(f"[WARN] Error creando notificación: {e}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error actualizando calificación de tarea: {e}")

@grading_router.post("/quizzes")
def update_quiz_grade(
    request: QuizGradeRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles(["profesor", "empresa", "admin"]))
):
    """
    Actualiza calificación de un quiz
    
    - **request**: Datos de la calificación de quiz
    - **Returns**: Resultado de la operación y calificación actualizada
    """
    try:
        grading_service = GradingService(db)
        result = grading_service.update_quiz_grade(
            username=request.estudiante_username,
            unidad_id=request.unidad_id,
            quiz_id=request.quiz_id,
            score=request.score
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Error actualizando calificación"))
        
        # Crear notificación para el estudiante
        try:
            _create_grade_notification(
                db, 
                request.estudiante_username, 
                request.unidad_id, 
                "quiz", 
                request.score,
                current_user.get("username")
            )
        except Exception as e:
            print(f"[WARN] Error creando notificación: {e}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error actualizando calificación de quiz: {e}")

@grading_router.post("/override")
def set_manual_override(
    request: ManualOverrideRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles(["profesor", "empresa", "admin"]))
):
    """
    Establece override manual de calificación final
    
    - **request**: Datos del override manual
    - **Returns**: Resultado de la operación y calificación actualizada
    """
    try:
        grading_service = GradingService(db)
        result = grading_service.set_manual_override(
            username=request.estudiante_username,
            unidad_id=request.unidad_id,
            score=request.score,
            aprobado=request.aprobado
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Error estableciendo override"))
        
        # Crear notificación para el estudiante
        try:
            _create_grade_notification(
                db, 
                request.estudiante_username, 
                request.unidad_id, 
                "override", 
                request.score or 0,
                current_user.get("username")
            )
        except Exception as e:
            print(f"[WARN] Error creando notificación: {e}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error estableciendo override manual: {e}")

@grading_router.get("/estudiantes/{username}/historial")
def get_grading_history(
    username: str,
    unidad_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles(["profesor", "empresa", "admin"]))
):
    """
    Obtiene historial de calificaciones de un estudiante
    
    - **username**: Username del estudiante
    - **unidad_id**: ID de unidad específica (opcional)
    - **limit**: Límite de registros (default: 50)
    - **Returns**: Historial de calificaciones ordenado por fecha
    """
    try:
        # Obtener historial de tareas
        tareas_query = db.query(models.TareaCalificacion).filter(
            models.TareaCalificacion.estudiante_username == username
        )
        if unidad_id:
            tareas_query = tareas_query.filter(models.TareaCalificacion.unidad_id == unidad_id)
        
        tareas = tareas_query.order_by(models.TareaCalificacion.updated_at.desc()).limit(limit).all()
        
        # Obtener historial de quizzes
        quizzes_query = db.query(models.EstudianteQuizCalificacion).filter(
            models.EstudianteQuizCalificacion.estudiante_username == username
        )
        if unidad_id:
            quizzes_query = quizzes_query.filter(models.EstudianteQuizCalificacion.unidad_id == unidad_id)
        
        quizzes = quizzes_query.order_by(models.EstudianteQuizCalificacion.updated_at.desc()).limit(limit).all()
        
        # Obtener historial de overrides
        overrides_query = db.query(models.UnidadCalificacionFinal).filter(
            models.UnidadCalificacionFinal.estudiante_username == username
        )
        if unidad_id:
            overrides_query = overrides_query.filter(models.UnidadCalificacionFinal.unidad_id == unidad_id)
        
        overrides = overrides_query.order_by(models.UnidadCalificacionFinal.updated_at.desc()).limit(limit).all()
        
        # Obtener nombres de unidades y quizzes para referencia
        unidades = {u.id: u.nombre for u in db.query(models.Unidad).all()}
        quizzes_info = {q.id: q.titulo for q in db.query(models.Quiz).all()}
        
        # Formatear historial
        historial = []
        
        # Agregar tareas
        for tarea in tareas:
            historial.append({
                "tipo": "tarea",
                "id": tarea.id,
                "unidad_id": tarea.unidad_id,
                "unidad_nombre": unidades.get(tarea.unidad_id, "Desconocida"),
                "filename": tarea.filename,
                "score": tarea.score,
                "fecha": tarea.updated_at.isoformat() if tarea.updated_at else None
            })
        
        # Agregar quizzes
        for quiz in quizzes:
            historial.append({
                "tipo": "quiz",
                "id": quiz.id,
                "unidad_id": quiz.unidad_id,
                "unidad_nombre": unidades.get(quiz.unidad_id, "Desconocida"),
                "quiz_id": quiz.quiz_id,
                "quiz_titulo": quizzes_info.get(quiz.quiz_id, "Desconocido"),
                "score": quiz.score,
                "fecha": quiz.updated_at.isoformat() if quiz.updated_at else None
            })
        
        # Agregar overrides
        for override in overrides:
            historial.append({
                "tipo": "override",
                "id": override.id,
                "unidad_id": override.unidad_id,
                "unidad_nombre": unidades.get(override.unidad_id, "Desconocida"),
                "score": override.score,
                "aprobado": override.aprobado,
                "fecha": override.updated_at.isoformat() if override.updated_at else None
            })
        
        # Ordenar por fecha descendente
        historial.sort(key=lambda x: x.get("fecha", ""), reverse=True)
        
        return {
            "username": username,
            "unidad_id": unidad_id,
            "total_registros": len(historial),
            "historial": historial[:limit]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo historial: {e}")

@grading_router.get("/estadisticas/general")
def get_general_statistics(
    db: Session = Depends(get_db),
    current_user = Depends(require_roles(["empresa", "admin"]))
):
    """
    Obtiene estadísticas generales del sistema de calificaciones
    
    - **Returns**: Estadísticas generales de calificaciones
    """
    try:
        # Estadísticas básicas
        total_estudiantes = db.query(models.Registro).filter(
            models.Registro.tipo_usuario == "estudiante"
        ).count()
        
        total_unidades = db.query(models.Unidad).count()
        
        total_tareas_calificadas = db.query(models.TareaCalificacion).count()
        
        total_quizzes_calificados = db.query(models.EstudianteQuizCalificacion).count()
        
        # Promedio general de calificaciones
        from sqlalchemy import func
        
        promedio_tareas = db.query(func.avg(models.TareaCalificacion.score)).scalar()
        promedio_quizzes = db.query(func.avg(models.EstudianteQuizCalificacion.score)).scalar()
        
        # Distribución de calificaciones
        distribuciones = {
            "excelente": {"tareas": 0, "quizzes": 0},  # 90-100
            "bueno": {"tareas": 0, "quizzes": 0},      # 80-89
            "regular": {"tareas": 0, "quizzes": 0},    # 70-79
            "deficiente": {"tareas": 0, "quizzes": 0}  # 0-69
        }
        
        # Contar distribución de tareas
        for rango, label in [(90, "excelente"), (80, "bueno"), (70, "regular"), (0, "deficiente")]:
            if label == "deficiente":
                count = db.query(models.TareaCalificacion).filter(
                    models.TareaCalificacion.score < 70
                ).count()
            else:
                upper = 100 if label == "excelente" else rango + 9
                count = db.query(models.TareaCalificacion).filter(
                    models.TareaCalificacion.score >= rango,
                    models.TareaCalificacion.score <= upper
                ).count()
            distribuciones[label]["tareas"] = count
        
        # Contar distribución de quizzes
        for rango, label in [(90, "excelente"), (80, "bueno"), (70, "regular"), (0, "deficiente")]:
            if label == "deficiente":
                count = db.query(models.EstudianteQuizCalificacion).filter(
                    models.EstudianteQuizCalificacion.score < 70
                ).count()
            else:
                upper = 100 if label == "excelente" else rango + 9
                count = db.query(models.EstudianteQuizCalificacion).filter(
                    models.EstudianteQuizCalificacion.score >= rango,
                    models.EstudianteQuizCalificacion.score <= upper
                ).count()
            distribuciones[label]["quizzes"] = count
        
        return {
            "resumen": {
                "total_estudiantes": total_estudiantes,
                "total_unidades": total_unidades,
                "total_tareas_calificadas": total_tareas_calificadas,
                "total_quizzes_calificados": total_quizzes_calificados
            },
            "promedios": {
                "tareas": round(float(promedio_tareas or 0), 2),
                "quizzes": round(float(promedio_quizzes or 0), 2)
            },
            "distribuciones": distribuciones,
            "calculado_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo estadísticas: {e}")

# Funciones auxiliares

def _create_grade_notification(db: Session, username: str, unidad_id: int, tipo: str, score: int, remitente_username: str):
    """Crea notificación de calificación para el estudiante"""
    try:
        # Obtener estudiante y remitente
        estudiante = db.query(models.Registro).filter(models.Registro.username == username).first()
        remitente = db.query(models.Registro).filter(models.Registro.username == remitente_username).first()
        
        if not estudiante:
            return
        
        # Crear mensaje según tipo
        if tipo == "tarea":
            mensaje = f"Tu tarea de la unidad {unidad_id} fue calificada: {score}/100"
        elif tipo == "quiz":
            mensaje = f"Tu quiz de la unidad {unidad_id} fue calificado: {score}/100"
        elif tipo == "override":
            mensaje = f"La calificación final de la unidad {unidad_id} fue actualizada manualmente"
        else:
            mensaje = f"Tu calificación de la unidad {unidad_id} fue actualizada: {score}/100"
        
        # Crear notificación
        notificacion = models.Notificacion(
            usuario_id=estudiante.identificador,
            tipo=f"{tipo}_calificada",
            mensaje=mensaje,
            usuario_remitente_id=remitente.identificador if remitente else None,
            unidad_id=unidad_id,
            fecha_creacion=datetime.utcnow()
        )
        
        db.add(notificacion)
        db.commit()
        
    except Exception as e:
        print(f"[ERROR] Error creando notificación: {e}")
        db.rollback()

@grading_router.post("/admin/sync-all-grades")
def sync_all_grades(
    db: Session = Depends(get_db),
    current_user = Depends(require_roles(["admin", "empresa"]))
):
    """
    Sincroniza todas las calificaciones existentes con el nuevo sistema
    
    - **ADMIN ONLY**: Este endpoint sincroniza todos los datos existentes
    - **Returns**: Resultado de la sincronización masiva
    """
    try:
        grading_service = GradingService(db)
        
        # Obtener todos los estudiantes
        estudiantes = db.query(models.Registro).filter(
            models.Registro.tipo_usuario == "estudiante"
        ).all()
        
        # Obtener todas las unidades
        unidades = db.query(models.Unidad).all()
        
        sync_results = {
            "estudiantes_procesados": 0,
            "unidades_sincronizadas": 0,
            "errores": []
        }
        
        for estudiante in estudiantes:
            try:
                for unidad in unidades:
                    # Sincronizar progreso de cada unidad
                    grading_service._sync_unit_progress(estudiante.username, unidad.id)
                    sync_results["unidades_sincronizadas"] += 1
                
                sync_results["estudiantes_procesados"] += 1
                
            except Exception as e:
                error_msg = f"Error sincronizando {estudiante.username}: {e}"
                sync_results["errores"].append(error_msg)
                print(f"[ERROR] {error_msg}")
        
        return {
            "success": True,
            "mensaje": "Sincronización completada",
            "resultados": sync_results,
            "sincronizado_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Error en sincronización masiva: {e}",
            "sincronizado_at": datetime.utcnow().isoformat()
        }

@grading_router.get("/admin/validate-consistency")
def validate_grading_consistency(
    db: Session = Depends(get_db),
    current_user = Depends(require_roles(["admin", "empresa"]))
):
    """
    Valida la consistencia del sistema de calificaciones
    
    - **ADMIN ONLY**: Verifica inconsistencias en los datos
    - **Returns**: Reporte de consistencia del sistema
    """
    try:
        inconsistencies = []
        
        # 1. Verificar calificaciones de tareas sin progreso correspondiente
        tareas_sin_progreso = db.query(models.TareaCalificacion).outerjoin(
            models.EstudianteProgresoUnidad,
            (models.TareaCalificacion.estudiante_username == models.EstudianteProgresoUnidad.username) &
            (models.TareaCalificacion.unidad_id == models.EstudianteProgresoUnidad.unidad_id)
        ).filter(models.EstudianteProgresoUnidad.id.is_(None)).count()
        
        if tareas_sin_progreso > 0:
            inconsistencies.append(f"{tareas_sin_progreso} calificaciones de tareas sin registro de progreso")
        
        # 2. Verificar calificaciones de quizzes sin progreso correspondiente
        quizzes_sin_progreso = db.query(models.EstudianteQuizCalificacion).outerjoin(
            models.EstudianteProgresoUnidad,
            (models.EstudianteQuizCalificacion.estudiante_username == models.EstudianteProgresoUnidad.username) &
            (models.EstudianteQuizCalificacion.unidad_id == models.EstudianteProgresoUnidad.unidad_id)
        ).filter(models.EstudianteProgresoUnidad.id.is_(None)).count()
        
        if quizzes_sin_progreso > 0:
            inconsistencies.append(f"{quizzes_sin_progreso} calificaciones de quizzes sin registro de progreso")
        
        # 3. Verificar overrides huérfanos
        overrides_huerfanos = db.query(models.UnidadCalificacionFinal).outerjoin(
            models.Registro,
            models.UnidadCalificacionFinal.estudiante_username == models.Registro.username
        ).filter(models.Registro.username.is_(None)).count()
        
        if overrides_huerfanos > 0:
            inconsistencies.append(f"{overrides_huerfanos} overrides de calificación con estudiantes inexistentes")
        
        # 4. Verificar quizzes referenciando unidades inexistentes
        quizzes_unidades_inexistentes = db.query(models.Quiz).outerjoin(
            models.Unidad,
            models.Quiz.unidad_id == models.Unidad.id
        ).filter(models.Unidad.id.is_(None)).count()
        
        if quizzes_unidades_inexistentes > 0:
            inconsistencies.append(f"{quizzes_unidades_inexistentes} quizzes referenciando unidades inexistentes")
        
        # Estadísticas generales
        stats = {
            "total_estudiantes": db.query(models.Registro).filter(models.Registro.tipo_usuario == "estudiante").count(),
            "total_unidades": db.query(models.Unidad).count(),
            "total_tareas_calificadas": db.query(models.TareaCalificacion).count(),
            "total_quizzes_calificados": db.query(models.EstudianteQuizCalificacion).count(),
            "total_registros_progreso": db.query(models.EstudianteProgresoUnidad).count(),
            "total_overrides": db.query(models.UnidadCalificacionFinal).count()
        }
        
        return {
            "consistente": len(inconsistencies) == 0,
            "inconsistencias_encontradas": len(inconsistencies),
            "detalles_inconsistencias": inconsistencies,
            "estadisticas": stats,
            "validado_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Error validando consistencia: {e}",
            "validado_at": datetime.utcnow().isoformat()
        }
