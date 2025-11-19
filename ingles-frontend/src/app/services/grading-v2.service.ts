import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

// Interfaces para el sistema de calificaciones V2
export interface GradeComponent {
  promedio: number | null;
  count: number;
  peso: number;
}

export interface TimeComponent {
  minutos: number;
  score: number;
  objetivo: number;
  peso: number;
}

export interface FinalGrade {
  nota: number;
  aprobado: boolean;
  umbral_aprobacion: number;
  override_manual: boolean;
}

export interface UnitGradeDetail {
  username: string;
  unidad_id: number;
  componentes: {
    tareas: GradeComponent;
    quizzes: GradeComponent;
    tiempo: TimeComponent;
  };
  calificacion_final: FinalGrade;
  calculado_at: string;
}

export interface StudentGradesSummary {
  username: string;
  resumen: {
    total_unidades: number;
    unidades_aprobadas: number;
    unidades_pendientes: number;
    promedio_general: number;
    porcentaje_aprobacion: number;
  };
  unidades: Array<{
    unidad_id: number;
    nombre: string;
    descripcion: string;
    orden: number;
    grade_data: UnitGradeDetail;
  }>;
  calculado_at: string;
}

export interface TaskGradeRequest {
  estudiante_username: string;
  unidad_id: number;
  filename: string;
  score: number;
}

export interface QuizGradeRequest {
  estudiante_username: string;
  unidad_id: number;
  quiz_id: number;
  score: number;
}

export interface ManualOverrideRequest {
  estudiante_username: string;
  unidad_id: number;
  score?: number;
  aprobado?: boolean;
}

export interface GradingHistoryItem {
  tipo: 'tarea' | 'quiz' | 'override';
  id: number;
  unidad_id: number;
  unidad_nombre: string;
  filename?: string;
  quiz_id?: number;
  quiz_titulo?: string;
  score: number;
  aprobado?: boolean;
  fecha: string;
}

export interface GradingHistory {
  username: string;
  unidad_id?: number;
  total_registros: number;
  historial: GradingHistoryItem[];
}

export interface GeneralStatistics {
  resumen: {
    total_estudiantes: number;
    total_unidades: number;
    total_tareas_calificadas: number;
    total_quizzes_calificados: number;
  };
  promedios: {
    tareas: number;
    quizzes: number;
  };
  distribuciones: {
    excelente: { tareas: number; quizzes: number };
    bueno: { tareas: number; quizzes: number };
    regular: { tareas: number; quizzes: number };
    deficiente: { tareas: number; quizzes: number };
  };
  calculado_at: string;
}

export interface ConsistencyValidation {
  consistente: boolean;
  inconsistencias_encontradas: number;
  detalles_inconsistencias: string[];
  estadisticas: {
    total_estudiantes: number;
    total_unidades: number;
    total_tareas_calificadas: number;
    total_quizzes_calificados: number;
    total_registros_progreso: number;
    total_overrides: number;
  };
  validado_at: string;
}

export interface SyncResult {
  success: boolean;
  mensaje?: string;
  resultados?: {
    estudiantes_procesados: number;
    unidades_sincronizadas: number;
    errores: string[];
  };
  error?: string;
  sincronizado_at: string;
}

@Injectable({ providedIn: 'root' })
export class GradingV2Service {
  private baseUrl = 'http://localhost:8000/api/v2/grades';

  constructor(private http: HttpClient) {}

  private getHeaders() {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    let headers: any = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return { headers: new HttpHeaders(headers) };
  }

  // ===== ENDPOINTS PRINCIPALES =====

  /**
   * Obtiene resumen completo de calificaciones de un estudiante
   */
  getStudentGradesSummary(username: string): Observable<StudentGradesSummary> {
    return this.http.get<StudentGradesSummary>(
      `${this.baseUrl}/estudiantes/${encodeURIComponent(username)}/resumen`,
      this.getHeaders()
    );
  }

  /**
   * Obtiene calificación detallada de una unidad específica
   */
  getUnitGradeDetail(username: string, unidadId: number): Observable<UnitGradeDetail> {
    return this.http.get<UnitGradeDetail>(
      `${this.baseUrl}/estudiantes/${encodeURIComponent(username)}/unidades/${unidadId}`,
      this.getHeaders()
    );
  }

  /**
   * Actualiza calificación de una tarea
   */
  updateTaskGrade(request: TaskGradeRequest): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/tareas`,
      request,
      this.getHeaders()
    );
  }

  /**
   * Actualiza calificación de un quiz
   */
  updateQuizGrade(request: QuizGradeRequest): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/quizzes`,
      request,
      this.getHeaders()
    );
  }

  /**
   * Establece override manual de calificación final
   */
  setManualOverride(request: ManualOverrideRequest): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/override`,
      request,
      this.getHeaders()
    );
  }

  /**
   * Obtiene historial de calificaciones de un estudiante
   */
  getGradingHistory(username: string, unidadId?: number, limit: number = 50): Observable<GradingHistory> {
    let url = `${this.baseUrl}/estudiantes/${encodeURIComponent(username)}/historial?limit=${limit}`;
    if (unidadId) {
      url += `&unidad_id=${unidadId}`;
    }
    return this.http.get<GradingHistory>(url, this.getHeaders());
  }

  /**
   * Obtiene estadísticas generales del sistema de calificaciones
   */
  getGeneralStatistics(): Observable<GeneralStatistics> {
    return this.http.get<GeneralStatistics>(
      `${this.baseUrl}/estadisticas/general`,
      this.getHeaders()
    );
  }

  // ===== ENDPOINTS DE ADMINISTRACIÓN =====

  /**
   * Sincroniza todas las calificaciones existentes con el nuevo sistema
   */
  syncAllGrades(): Observable<SyncResult> {
    return this.http.post<SyncResult>(
      `${this.baseUrl}/admin/sync-all-grades`,
      {},
      this.getHeaders()
    );
  }

  /**
   * Valida la consistencia del sistema de calificaciones
   */
  validateConsistency(): Observable<ConsistencyValidation> {
    return this.http.get<ConsistencyValidation>(
      `${this.baseUrl}/admin/validate-consistency`,
      this.getHeaders()
    );
  }

  // ===== MÉTODOS HELPER =====

  /**
   * Formatea un score como porcentaje
   */
  formatScore(score: number | null): string {
    if (score === null || score === undefined) {
      return 'N/A';
    }
    return `${Math.round(score)}%`;
  }

  /**
   * Obtiene la clase CSS para un score
   */
  getScoreClass(score: number | null): string {
    if (score === null || score === undefined) {
      return 'text-gray-500';
    }
    if (score >= 90) return 'text-green-600 font-semibold';
    if (score >= 80) return 'text-blue-600 font-semibold';
    if (score >= 70) return 'text-yellow-600 font-semibold';
    if (score >= 60) return 'text-orange-600 font-semibold';
    return 'text-red-600 font-semibold';
  }

  /**
   * Obtiene el color para una barra de progreso
   */
  getProgressColor(score: number | null): string {
    if (score === null || score === undefined) {
      return '#6b7280'; // gray-500
    }
    if (score >= 90) return '#10b981'; // green-500
    if (score >= 80) return '#3b82f6'; // blue-500
    if (score >= 70) return '#f59e0b'; // yellow-500
    if (score >= 60) return '#f97316'; // orange-500
    return '#ef4444'; // red-500
  }

  /**
   * Formatea una fecha ISO a formato legible
   */
  formatDate(isoDate: string): string {
    try {
      const date = new Date(isoDate);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  /**
   * Obtiene el icono para un tipo de calificación
   */
  getGradeTypeIcon(tipo: string): string {
    switch (tipo) {
      case 'tarea': return '📝';
      case 'quiz': return '🧩';
      case 'override': return '🔧';
      default: return '📊';
    }
  }

  /**
   * Obtiene el texto descriptivo para un tipo de calificación
   */
  getGradeTypeLabel(tipo: string): string {
    switch (tipo) {
      case 'tarea': return 'Tarea';
      case 'quiz': return 'Quiz';
      case 'override': return 'Ajuste Manual';
      default: return 'Calificación';
    }
  }

  /**
   * Calcula el promedio de un array de scores
   */
  calculateAverage(scores: number[]): number {
    if (scores.length === 0) return 0;
    const sum = scores.reduce((acc, score) => acc + score, 0);
    return Math.round((sum / scores.length) * 100) / 100;
  }

  /**
   * Verifica si un estudiante ha aprobado una unidad
   */
  isUnitPassed(gradeDetail: UnitGradeDetail): boolean {
    return gradeDetail.calificacion_final.aprobado;
  }

  /**
   * Obtiene el estado de aprobación como texto
   */
  getApprovalStatus(gradeDetail: UnitGradeDetail): string {
    if (gradeDetail.calificacion_final.aprobado) {
      return gradeDetail.calificacion_final.override_manual ? 'Aprobado (Manual)' : 'Aprobado';
    }
    return 'Pendiente';
  }

  /**
   * Obtiene la clase CSS para el estado de aprobación
   */
  getApprovalStatusClass(gradeDetail: UnitGradeDetail): string {
    if (gradeDetail.calificacion_final.aprobado) {
      return gradeDetail.calificacion_final.override_manual 
        ? 'bg-blue-100 text-blue-800' 
        : 'bg-green-100 text-green-800';
    }
    return 'bg-yellow-100 text-yellow-800';
  }
}
