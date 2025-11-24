import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface QuizCreate {
  unidad_id: number;
  titulo: string;
  descripcion?: string | null;
  preguntas?: any | null;
}

export interface QuizResponse extends QuizCreate {
  id: number;
  created_at: string;
}

export interface QuizAsignacionCreate {
  unidad_id: number;
  start_at?: string | null;
  end_at?: string | null;
  max_intentos?: number | null;
  tiempo_limite_minutos?: number | null;
}

export interface QuizAsignacionResponse extends QuizAsignacionCreate {
  id: number;
  quiz_id: number;
  created_at: string;
}

export interface QuizRespuestaCreate {
  quiz_id: number;
  respuestas: { [key: string]: any };
}

export interface QuizRespuestaResponse {
  id: number;
  estudiante_username: string;
  quiz_id: number;
  unidad_id: number;
  respuestas: { [key: string]: any };
  score: number;
  created_at: string;
  updated_at: string;
}

export interface QuizDetalleEstudiante {
  id: number;
  unidad_id: number;
  titulo: string;
  descripcion?: string | null;
  preguntas?: any | null;
  ya_respondido: boolean;
  calificacion?: number | null;
  fecha_respuesta?: string | null;
  intentos_realizados?: number;
  max_intentos?: number | null;
  puede_intentar?: boolean;
  tiempo_limite_minutos?: number | null;
}

@Injectable({ providedIn: 'root' })
export class QuizzesService {
  private base = 'http://localhost:8000/auth';
  constructor(private http: HttpClient) {}

  private headers() {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    let headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return { headers: new HttpHeaders(headers) };
  }

  listar(unidad_id?: number): Observable<QuizResponse[]> {
    let params = new HttpParams();
    if (unidad_id != null) params = params.set('unidad_id', String(unidad_id));
    return this.http.get<QuizResponse[]>(`${this.base}/quizzes`, { params, ...this.headers() });
    }

  crear(payload: QuizCreate): Observable<QuizResponse> {
    return this.http.post<QuizResponse>(`${this.base}/quizzes`, payload, this.headers());
  }

  obtener(id: number): Observable<QuizResponse> {
    return this.http.get<QuizResponse>(`${this.base}/quizzes/${id}`, this.headers());
  }

  actualizar(id: number, payload: QuizCreate): Observable<QuizResponse> {
    return this.http.put<QuizResponse>(`${this.base}/quizzes/${id}`, payload, this.headers());
  }

  eliminar(id: number): Observable<{ eliminado: boolean; id: number }> {
    return this.http.delete<{ eliminado: boolean; id: number }>(`${this.base}/quizzes/${id}`, this.headers());
  }

  crearAsignacion(quiz_id: number, payload: QuizAsignacionCreate): Observable<QuizAsignacionResponse> {
    return this.http.post<QuizAsignacionResponse>(`${this.base}/quizzes/${quiz_id}/assignments`, payload, this.headers());
  }

  listarAsignaciones(quiz_id: number): Observable<QuizAsignacionResponse[]> {
    return this.http.get<QuizAsignacionResponse[]>(`${this.base}/quizzes/${quiz_id}/assignments`, this.headers());
  }

  eliminarAsignacion(quiz_id: number, asig_id: number): Observable<{ eliminada: boolean; id: number }> {
    return this.http.delete<{ eliminada: boolean; id: number }>(`${this.base}/quizzes/${quiz_id}/assignments/${asig_id}`, this.headers());
  }

  // ===== Estudiante =====
  listarDisponiblesEstudiante(): Observable<QuizResponse[]> {
    return this.http.get<QuizResponse[]>(`${this.base}/estudiante/quizzes-disponibles`, this.headers());
  }
  obtenerPublico(quiz_id: number): Observable<QuizResponse> {
    return this.http.get<QuizResponse>(`${this.base}/estudiante/quizzes/${quiz_id}`, this.headers());
  }

  obtenerDetalleEstudiante(quiz_id: number): Observable<QuizDetalleEstudiante> {
    return this.http.get<QuizDetalleEstudiante>(`${this.base}/estudiante/quizzes/${quiz_id}/detalle`, this.headers());
  }

  responderQuiz(quiz_id: number, respuestas: { [key: string]: any }): Observable<QuizRespuestaResponse> {
    const payload: QuizRespuestaCreate = { quiz_id, respuestas };
    return this.http.post<QuizRespuestaResponse>(`${this.base}/estudiante/quizzes/${quiz_id}/responder`, payload, this.headers());
  }

  obtenerMisCalificacionesQuizzes(): Observable<Array<{
    id: number;
    quiz_id: number;
    quiz_titulo: string;
    unidad_id: number;
    unidad_nombre: string;
    score: number;
    created_at: string;
    updated_at: string;
  }>> {
    return this.http.get<Array<any>>(`${this.base}/estudiante/mis-calificaciones-quizzes`, this.headers());
  }

  obtenerResumenCalificacionesUnidad(unidad_id: number): Observable<{
    tareas: Array<{id: number; filename: string; score: number; updated_at: string}>;
    quizzes: Array<{id: number; quiz_id: number; score: number; updated_at: string}>;
    progreso: {porcentaje_completado: number; score: number; tiempo_dedicado_min: number};
    resumen: {tareas_promedio: number | null; quiz_promedio: number | null; tiempo_min: number; tiempo_score: number; nota: number; aprobado: boolean};
    unidad: {id: number; nombre: string; descripcion?: string};
  }> {
    return this.http.get<any>(`${this.base}/estudiante/unidades/${unidad_id}/resumen-calificaciones`, this.headers());
  }

  // Checker: estudiantes habilitados por unidad
  getEstudiantesHabilitadosCount(unidad_id: number): Observable<{ unidad_id: number; estudiantes_habilitados: number }> {
    return this.http.get<{ unidad_id: number; estudiantes_habilitados: number }>(`${this.base}/unidades/${unidad_id}/estudiantes-habilitados-count`, this.headers());
  }

  listarRespuestas(quiz_id: number): Observable<QuizRespuestaResponse[]> {
    return this.http.get<QuizRespuestaResponse[]>(`${this.base}/quizzes/${quiz_id}/respuestas`, this.headers());
  }

  obtenerRespuesta(quiz_id: number, estudiante_username: string): Observable<QuizRespuestaResponse> {
    return this.http.get<QuizRespuestaResponse>(`${this.base}/quizzes/${quiz_id}/respuestas/${encodeURIComponent(estudiante_username)}`, this.headers());
  }

  // ===== Permisos de Quiz por Estudiante =====
  togglePermisoQuizEstudiante(username: string, quiz_id: number): Observable<{ estudiante_username: string; quiz_id: number; habilitado: boolean; mensaje: string }> {
    return this.http.post<{ estudiante_username: string; quiz_id: number; habilitado: boolean; mensaje: string }>(
      `${this.base}/estudiante/${encodeURIComponent(username)}/quiz/${quiz_id}/toggle-permiso`, 
      {}, 
      this.headers()
    );
  }

  listarPermisosQuizEstudiante(username: string): Observable<Array<{ quiz_id: number; habilitado: boolean; created_at: string; updated_at: string }>> {
    return this.http.get<Array<{ quiz_id: number; habilitado: boolean; created_at: string; updated_at: string }>>(
      `${this.base}/estudiante/${encodeURIComponent(username)}/quizzes-permisos`, 
      this.headers()
    );
  }
}
