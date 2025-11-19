"""
Servicio Centralizado de Calificaciones
=======================================

Este módulo proporciona un sistema unificado y consistente para manejar
todas las calificaciones del sistema educativo.

Características:
- Cálculo consistente de notas finales
- Sincronización automática entre tablas
- Validaciones robustas
- Transacciones atómicas
- Logging detallado
"""

from datetime import datetime
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
import models
import settings
from pathlib import Path
import json

class GradingService:
    """Servicio centralizado para manejo de calificaciones"""
    
    def __init__(self, db: Session):
        self.db = db
        self.settings = settings.settings
        
    def calculate_unit_grade(self, username: str, unidad_id: int) -> Dict:
        """
        Calcula la nota final de una unidad de forma consistente
        
        Args:
            username: Username del estudiante
            unidad_id: ID de la unidad
            
        Returns:
            Dict con todos los componentes de la calificación
        """
        try:
            # 1. Obtener promedios de tareas
            tareas_avg = self._get_tasks_average(username, unidad_id)
            tareas_count = self._get_tasks_count(username, unidad_id)
            
            # 2. Obtener promedios de quizzes
            quiz_avg = self._get_quiz_average(username, unidad_id)
            quiz_count = self._get_quiz_count(username, unidad_id)
            
            # 3. Obtener score de tiempo dedicado
            tiempo_data = self._get_time_score(username, unidad_id)
            
            # 4. Verificar override manual
            override = self._get_manual_override(username, unidad_id)
            
            # 5. Calcular nota final
            final_grade = self._calculate_final_grade(
                tareas_avg, quiz_avg, tiempo_data['score']
            )
            
            # 6. Determinar estado de aprobación
            aprobado = self._is_approved(final_grade, override)
            
            result = {
                "username": username,
                "unidad_id": unidad_id,
                "componentes": {
                    "tareas": {
                        "promedio": tareas_avg,
                        "count": tareas_count,
                        "peso": self.settings.GRADES_WT_TAREAS
                    },
                    "quizzes": {
                        "promedio": quiz_avg,
                        "count": quiz_count,
                        "peso": self.settings.GRADES_WT_QUIZ
                    },
                    "tiempo": {
                        "minutos": tiempo_data['minutos'],
                        "score": tiempo_data['score'],
                        "objetivo": tiempo_data['objetivo'],
                        "peso": self.settings.GRADES_WT_TIEMPO
                    }
                },
                "calificacion_final": {
                    "nota": final_grade,
                    "aprobado": aprobado,
                    "umbral_aprobacion": self.settings.GRADES_UMBRAL_APROBACION,
                    "override_manual": override is not None
                },
                "calculado_at": datetime.utcnow().isoformat()
            }
            
            return result
            
        except Exception as e:
            print(f"[ERROR] Error calculando calificación unidad {unidad_id} para {username}: {e}")
            return self._get_empty_grade_result(username, unidad_id)
    
    def update_task_grade(self, username: str, unidad_id: int, filename: str, score: int) -> Dict:
        """
        Actualiza calificación de tarea y sincroniza progreso
        
        Args:
            username: Username del estudiante
            unidad_id: ID de la unidad
            filename: Nombre del archivo de tarea
            score: Puntuación (0-100)
            
        Returns:
            Dict con resultado de la operación
        """
        try:
            # Validaciones
            if not (0 <= score <= 100):
                raise ValueError(f"Score debe estar entre 0 y 100, recibido: {score}")
            
            # Verificar que el estudiante existe
            estudiante = self.db.query(models.Registro).filter(
                models.Registro.username == username
            ).first()
            if not estudiante:
                raise ValueError(f"Estudiante no encontrado: {username}")
            
            # Verificar que la unidad existe
            unidad = self.db.query(models.Unidad).filter(
                models.Unidad.id == unidad_id
            ).first()
            if not unidad:
                raise ValueError(f"Unidad no encontrada: {unidad_id}")
            
            # Upsert calificación de tarea
            tarea_cal = self._upsert_task_grade(username, unidad_id, filename, score)
            
            # Sincronizar progreso de unidad
            self._sync_unit_progress(username, unidad_id)
            
            # Obtener calificación actualizada
            grade_result = self.calculate_unit_grade(username, unidad_id)
            
            return {
                "success": True,
                "tarea_calificacion_id": tarea_cal.id,
                "filename": filename,
                "score": score,
                "unidad_grade": grade_result,
                "updated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.db.rollback()
            print(f"[ERROR] Error actualizando calificación tarea: {e}")
            return {
                "success": False,
                "error": str(e),
                "username": username,
                "unidad_id": unidad_id,
                "filename": filename
            }
    
    def update_quiz_grade(self, username: str, unidad_id: int, quiz_id: int, score: int) -> Dict:
        """
        Actualiza calificación de quiz y sincroniza progreso
        
        Args:
            username: Username del estudiante
            unidad_id: ID de la unidad
            quiz_id: ID del quiz
            score: Puntuación (0-100)
            
        Returns:
            Dict con resultado de la operación
        """
        try:
            # Validaciones
            if not (0 <= score <= 100):
                raise ValueError(f"Score debe estar entre 0 y 100, recibido: {score}")
            
            # Verificar que el quiz existe y pertenece a la unidad
            quiz = self.db.query(models.Quiz).filter(
                models.Quiz.id == quiz_id,
                models.Quiz.unidad_id == unidad_id
            ).first()
            if not quiz:
                raise ValueError(f"Quiz {quiz_id} no encontrado en unidad {unidad_id}")
            
            # Upsert calificación de quiz
            quiz_cal = self._upsert_quiz_grade(username, unidad_id, quiz_id, score)
            
            # Sincronizar progreso de unidad
            self._sync_unit_progress(username, unidad_id)
            
            # Obtener calificación actualizada
            grade_result = self.calculate_unit_grade(username, unidad_id)
            
            return {
                "success": True,
                "quiz_calificacion_id": quiz_cal.id,
                "quiz_id": quiz_id,
                "score": score,
                "unidad_grade": grade_result,
                "updated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.db.rollback()
            print(f"[ERROR] Error actualizando calificación quiz: {e}")
            return {
                "success": False,
                "error": str(e),
                "username": username,
                "unidad_id": unidad_id,
                "quiz_id": quiz_id
            }
    
    def set_manual_override(self, username: str, unidad_id: int, score: Optional[int], aprobado: Optional[bool]) -> Dict:
        """
        Establece override manual de calificación final
        
        Args:
            username: Username del estudiante
            unidad_id: ID de la unidad
            score: Score manual (opcional)
            aprobado: Estado de aprobación manual (opcional)
            
        Returns:
            Dict con resultado de la operación
        """
        try:
            # Validaciones
            if score is not None and not (0 <= score <= 100):
                raise ValueError(f"Score debe estar entre 0 y 100, recibido: {score}")
            
            # Upsert override
            override = self.db.query(models.UnidadCalificacionFinal).filter(
                models.UnidadCalificacionFinal.estudiante_username == username,
                models.UnidadCalificacionFinal.unidad_id == unidad_id
            ).first()
            
            now = datetime.utcnow()
            
            if override:
                if score is not None:
                    override.score = score
                if aprobado is not None:
                    override.aprobado = aprobado
                override.updated_at = now
            else:
                override = models.UnidadCalificacionFinal(
                    estudiante_username=username,
                    unidad_id=unidad_id,
                    score=score,
                    aprobado=aprobado,
                    updated_at=now
                )
                self.db.add(override)
            
            self.db.commit()
            self.db.refresh(override)
            
            # Obtener calificación actualizada
            grade_result = self.calculate_unit_grade(username, unidad_id)
            
            return {
                "success": True,
                "override_id": override.id,
                "score_override": score,
                "aprobado_override": aprobado,
                "unidad_grade": grade_result,
                "updated_at": now.isoformat()
            }
            
        except Exception as e:
            self.db.rollback()
            print(f"[ERROR] Error estableciendo override manual: {e}")
            return {
                "success": False,
                "error": str(e),
                "username": username,
                "unidad_id": unidad_id
            }
    
    def get_student_grades_summary(self, username: str) -> Dict:
        """
        Obtiene resumen completo de calificaciones del estudiante
        
        Args:
            username: Username del estudiante
            
        Returns:
            Dict con resumen completo de calificaciones
        """
        try:
            # Obtener todas las unidades
            unidades = self.db.query(models.Unidad).order_by(models.Unidad.orden).all()
            
            unidades_grades = []
            total_score = 0
            aprobadas = 0
            
            for unidad in unidades:
                grade_data = self.calculate_unit_grade(username, unidad.id)
                
                unidad_info = {
                    "unidad_id": unidad.id,
                    "nombre": unidad.nombre,
                    "descripcion": unidad.descripcion,
                    "orden": unidad.orden,
                    "grade_data": grade_data
                }
                
                unidades_grades.append(unidad_info)
                
                final_score = grade_data['calificacion_final']['nota']
                total_score += final_score
                
                if grade_data['calificacion_final']['aprobado']:
                    aprobadas += 1
            
            promedio_general = total_score / len(unidades) if unidades else 0
            
            return {
                "username": username,
                "resumen": {
                    "total_unidades": len(unidades),
                    "unidades_aprobadas": aprobadas,
                    "unidades_pendientes": len(unidades) - aprobadas,
                    "promedio_general": round(promedio_general, 2),
                    "porcentaje_aprobacion": round((aprobadas / len(unidades)) * 100, 2) if unidades else 0
                },
                "unidades": unidades_grades,
                "calculado_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            print(f"[ERROR] Error obteniendo resumen de calificaciones: {e}")
            return {
                "success": False,
                "error": str(e),
                "username": username
            }
    
    # Métodos privados de apoyo
    
    def _get_tasks_average(self, username: str, unidad_id: int) -> Optional[float]:
        """Obtiene promedio de calificaciones de tareas"""
        avg = self.db.query(func.avg(models.TareaCalificacion.score)).filter(
            models.TareaCalificacion.estudiante_username == username,
            models.TareaCalificacion.unidad_id == unidad_id
        ).scalar()
        return float(avg) if avg is not None else None
    
    def _get_tasks_count(self, username: str, unidad_id: int) -> int:
        """Obtiene cantidad de tareas calificadas"""
        return self.db.query(models.TareaCalificacion).filter(
            models.TareaCalificacion.estudiante_username == username,
            models.TareaCalificacion.unidad_id == unidad_id
        ).count()
    
    def _get_quiz_average(self, username: str, unidad_id: int) -> Optional[float]:
        """Obtiene promedio de calificaciones de quizzes"""
        avg = self.db.query(func.avg(models.EstudianteQuizCalificacion.score)).filter(
            models.EstudianteQuizCalificacion.estudiante_username == username,
            models.EstudianteQuizCalificacion.unidad_id == unidad_id
        ).scalar()
        return float(avg) if avg is not None else None
    
    def _get_quiz_count(self, username: str, unidad_id: int) -> int:
        """Obtiene cantidad de quizzes calificados"""
        return self.db.query(models.EstudianteQuizCalificacion).filter(
            models.EstudianteQuizCalificacion.estudiante_username == username,
            models.EstudianteQuizCalificacion.unidad_id == unidad_id
        ).count()
    
    def _get_time_score(self, username: str, unidad_id: int) -> Dict:
        """Obtiene score basado en tiempo dedicado"""
        prog = self.db.query(models.EstudianteProgresoUnidad).filter(
            models.EstudianteProgresoUnidad.username == username,
            models.EstudianteProgresoUnidad.unidad_id == unidad_id
        ).first()
        
        tiempo_min = int(getattr(prog, 'tiempo_dedicado_min', 0) or 0)
        objetivo = max(1, int(self.settings.GRADES_OBJETIVO_MIN))
        tiempo_score = min(100, int((tiempo_min * 100) / objetivo))
        
        return {
            "minutos": tiempo_min,
            "score": tiempo_score,
            "objetivo": objetivo
        }
    
    def _get_manual_override(self, username: str, unidad_id: int) -> Optional[models.UnidadCalificacionFinal]:
        """Obtiene override manual si existe"""
        return self.db.query(models.UnidadCalificacionFinal).filter(
            models.UnidadCalificacionFinal.estudiante_username == username,
            models.UnidadCalificacionFinal.unidad_id == unidad_id
        ).first()
    
    def _calculate_final_grade(self, tareas_avg: Optional[float], quiz_avg: Optional[float], tiempo_score: int) -> int:
        """Calcula nota final usando pesos configurados"""
        # Normalizar pesos
        wt_tareas = float(self.settings.GRADES_WT_TAREAS)
        wt_quiz = float(self.settings.GRADES_WT_QUIZ)
        wt_tiempo = float(self.settings.GRADES_WT_TIEMPO)
        
        total_weight = max(0.0001, wt_tareas + wt_quiz + wt_tiempo)
        wt_tareas /= total_weight
        wt_quiz /= total_weight
        wt_tiempo /= total_weight
        
        # Calcular componentes
        tareas_component = (tareas_avg or 0.0) * wt_tareas
        quiz_component = (quiz_avg or 0.0) * wt_quiz
        tiempo_component = tiempo_score * wt_tiempo
        
        final_grade = int(round(tareas_component + quiz_component + tiempo_component))
        return max(0, min(100, final_grade))
    
    def _is_approved(self, final_grade: int, override: Optional[models.UnidadCalificacionFinal]) -> bool:
        """Determina si la unidad está aprobada"""
        if override and override.aprobado is not None:
            return override.aprobado
        
        return final_grade >= int(self.settings.GRADES_UMBRAL_APROBACION)
    
    def _upsert_task_grade(self, username: str, unidad_id: int, filename: str, score: int) -> models.TareaCalificacion:
        """Upsert de calificación de tarea"""
        tarea_cal = self.db.query(models.TareaCalificacion).filter(
            models.TareaCalificacion.estudiante_username == username,
            models.TareaCalificacion.unidad_id == unidad_id,
            models.TareaCalificacion.filename == filename
        ).first()
        
        now = datetime.utcnow()
        
        if tarea_cal:
            tarea_cal.score = score
            tarea_cal.updated_at = now
        else:
            tarea_cal = models.TareaCalificacion(
                estudiante_username=username,
                unidad_id=unidad_id,
                filename=filename,
                score=score,
                created_at=now,
                updated_at=now
            )
            self.db.add(tarea_cal)
        
        self.db.commit()
        self.db.refresh(tarea_cal)
        return tarea_cal
    
    def _upsert_quiz_grade(self, username: str, unidad_id: int, quiz_id: int, score: int) -> models.EstudianteQuizCalificacion:
        """Upsert de calificación de quiz"""
        quiz_cal = self.db.query(models.EstudianteQuizCalificacion).filter(
            models.EstudianteQuizCalificacion.estudiante_username == username,
            models.EstudianteQuizCalificacion.unidad_id == unidad_id,
            models.EstudianteQuizCalificacion.quiz_id == quiz_id
        ).first()
        
        now = datetime.utcnow()
        
        if quiz_cal:
            quiz_cal.score = score
            quiz_cal.updated_at = now
        else:
            quiz_cal = models.EstudianteQuizCalificacion(
                estudiante_username=username,
                unidad_id=unidad_id,
                quiz_id=quiz_id,
                score=score,
                created_at=now,
                updated_at=now
            )
            self.db.add(quiz_cal)
        
        self.db.commit()
        self.db.refresh(quiz_cal)
        return quiz_cal
    
    def _sync_unit_progress(self, username: str, unidad_id: int):
        """Sincroniza progreso de unidad basado en calificaciones"""
        try:
            # Obtener o crear registro de progreso
            prog = self.db.query(models.EstudianteProgresoUnidad).filter(
                models.EstudianteProgresoUnidad.username == username,
                models.EstudianteProgresoUnidad.unidad_id == unidad_id
            ).first()
            
            if not prog:
                prog = models.EstudianteProgresoUnidad(
                    username=username,
                    unidad_id=unidad_id,
                    porcentaje_completado=0,
                    score=0,
                    tiempo_dedicado_min=0,
                    ultima_actividad_at=datetime.utcnow()
                )
                self.db.add(prog)
            
            # Calcular nuevo score basado en calificaciones actuales
            grade_data = self.calculate_unit_grade(username, unidad_id)
            new_score = grade_data['calificacion_final']['nota']
            
            # Actualizar score y timestamp
            prog.score = new_score
            prog.ultima_actividad_at = datetime.utcnow()
            
            self.db.commit()
            
        except Exception as e:
            print(f"[ERROR] Error sincronizando progreso de unidad: {e}")
            self.db.rollback()
    
    def _get_empty_grade_result(self, username: str, unidad_id: int) -> Dict:
        """Retorna resultado vacío en caso de error"""
        return {
            "username": username,
            "unidad_id": unidad_id,
            "componentes": {
                "tareas": {"promedio": None, "count": 0, "peso": 0},
                "quizzes": {"promedio": None, "count": 0, "peso": 0},
                "tiempo": {"minutos": 0, "score": 0, "objetivo": 120, "peso": 0}
            },
            "calificacion_final": {
                "nota": 0,
                "aprobado": False,
                "umbral_aprobacion": 60,
                "override_manual": False
            },
            "error": True,
            "calculado_at": datetime.utcnow().isoformat()
        }
