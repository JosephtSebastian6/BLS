import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class EmpresaGruposService {
  private base = 'http://localhost:8000/auth';
  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
    let h = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) h = h.set('Authorization', `Bearer ${token}`);
    return h;
  }

  listarProfesores(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/profesor/`, { headers: this.headers() });
  }

  listarEstudiantes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/estudiantes`, { headers: this.headers() });
  }

  crearGrupo(payload: { dia: string; hora: string; tema: string; meet_link?: string; profesor_username: string; estudiantes: string[] }): Observable<any> {
    return this.http.post(`${this.base}/clases/`, payload, { headers: this.headers() });
  }

  crearGrupoUnidad(payload: { profesor_username: string; unidad_id: number; estudiantes: string[] }): Observable<any> {
    return this.http.post(`${this.base}/grupos`, payload, { headers: this.headers() });
  }

  listarUnidades(): Observable<Array<{ id: number; nombre: string; descripcion?: string; subcarpetas_count?: number }>> {
    const headers = this.headers();
    console.log('[Svc] GET /unidades headers ->', headers.keys());
    return this.http.get<Array<{ id: number; nombre: string; descripcion?: string; subcarpetas_count?: number }>>(`${this.base}/unidades/`, { headers }).pipe(
      catchError((err) => {
        console.error('[Svc] GET /unidades ERROR ->', err);
        throw err;
      })
    );
  }

  crearUnidad(payload: { nombre: string; descripcion?: string; orden?: number }): Observable<any> {
    const headers = this.headers();
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';

    console.log('[Svc] === CREAR UNIDAD ===');
    console.log('[Svc] Base URL:', this.base);
    console.log('[Svc] Endpoint:', `${this.base}/unidades/`);
    console.log('[Svc] Payload:', payload);
    console.log('[Svc] Headers keys:', headers.keys());
    console.log('[Svc] Token disponible:', !!token);
    console.log('[Svc] Token preview:', token.substring(0, 20) + '...');

    return this.http.post(`${this.base}/unidades/`, payload, { headers }).pipe(
      catchError((err) => {
        console.error('[Svc] === ERROR CREAR UNIDAD ===');
        console.error('[Svc] Error status:', err?.status);
        console.error('[Svc] Error message:', err?.message);
        console.error('[Svc] Error details:', err);
        console.error('[Svc] Error url:', err?.url);
        console.error('[Svc] Error headers:', err?.headers);

        // Re-lanzar el error para que el componente lo maneje
        throw err;
      })
    );
  }

  actualizarUnidad(id: number, payload: { nombre?: string; descripcion?: string; orden?: number }): Observable<any> {
    return this.http.put(`${this.base}/unidades/${id}`, payload, { headers: this.headers() });
  }

  eliminarUnidad(id: number): Observable<any> {
    return this.http.delete(`${this.base}/unidades/${id}`, { headers: this.headers() });
  }

  deleteGrupo(grupoId: number): Observable<any> {
    return this.http.delete(`${this.base}/grupos/${grupoId}`, { headers: this.headers() });
  }

  // ===== Subcarpetas =====
  listarSubcarpetas(unidadId: number): Observable<Array<{ id: number; nombre: string; descripcion?: string; habilitada?: boolean; orden?: number }>> {
    const headers = this.headers();
    console.log('[Svc] GET /unidades/' + unidadId + '/subcarpetas headers ->', headers.keys());
    return this.http.get<Array<{ id: number; nombre: string; descripcion?: string; habilitada?: boolean; orden?: number }>>(`${this.base}/unidades/${unidadId}/subcarpetas`, { headers }).pipe(
      catchError((err) => {
        console.error('[Svc] GET subcarpetas ERROR ->', err);
        throw err;
      })
    );
  }

  crearSubcarpeta(unidadId: number, payload: { nombre: string; descripcion?: string; habilitada?: boolean; orden?: number }): Observable<any> {
    const headers = this.headers();
    console.log('[Svc] POST /unidades/' + unidadId + '/subcarpetas payload ->', payload);
    return this.http.post(`${this.base}/unidades/${unidadId}/subcarpetas`, payload, { headers }).pipe(
      catchError((err) => {
        console.error('[Svc] POST subcarpetas ERROR ->', err);
        throw err;
      })
    );
  }

  editarSubcarpeta(unidadId: number, subcarpetaId: number, payload: { nombre?: string; descripcion?: string; orden?: number }): Observable<any> {
    const headers = this.headers();
    console.log('[Svc] PUT /unidades/' + unidadId + '/subcarpetas/' + subcarpetaId + ' payload ->', payload);
    return this.http.put(`${this.base}/unidades/${unidadId}/subcarpetas/${subcarpetaId}`, payload, { headers }).pipe(
      catchError((err) => {
        console.error('[Svc] PUT subcarpetas ERROR ->', err);
        throw err;
      })
    );
  }

  eliminarSubcarpeta(unidadId: number, subcarpetaId: number): Observable<any> {
    const headers = this.headers();
    console.log('[Svc] DELETE /unidades/' + unidadId + '/subcarpetas/' + subcarpetaId);
    return this.http.delete(`${this.base}/unidades/${unidadId}/subcarpetas/${subcarpetaId}`, { headers }).pipe(
      catchError((err) => {
        console.error('[Svc] DELETE subcarpetas ERROR ->', err);
        throw err;
      })
    );
  }

  toggleSubcarpeta(unidadId: number, subcarpetaId: number): Observable<any> {
    const headers = this.headers();
    console.log('[Svc] PUT /unidades/' + unidadId + '/subcarpetas/' + subcarpetaId + '/toggle');
    return this.http.put(`${this.base}/unidades/${unidadId}/subcarpetas/${subcarpetaId}/toggle`, {}, { headers }).pipe(
      catchError((err) => {
        console.error('[Svc] PUT toggle subcarpetas ERROR ->', err);
        throw err;
      })
    );
  }

  // ===== Grupos por profesor =====
  listarGruposPorProfesor(profesorUsername: string): Observable<Array<{ id: number; tema: string; dia: string; hora: string; meet_link?: string; estudiantes: any[]; profesor_username: string; profesor_nombres?: string; profesor_apellidos?: string }>> {
    const headers = this.headers();
    console.log('[Svc] GET /clases/' + profesorUsername);
    return this.http.get<Array<{ id: number; tema: string; dia: string; hora: string; meet_link?: string; estudiantes: any[]; profesor_username: string; profesor_nombres?: string; profesor_apellidos?: string }>>(`${this.base}/clases/${encodeURIComponent(profesorUsername)}`, { headers }).pipe(
      catchError((err) => {
        console.error('[Svc] GET clases profesor ERROR ->', err);
        throw err;
      })
    );
  }

  // ===== Calificaciones =====
  upsertTareaCalificacion(payload: { estudiante_username: string; unidad_id: number; filename: string; score: number }): Observable<{ id: number; score: number }> {
    return this.http.post<{ id: number; score: number }>(`${this.base}/grades/tareas`, payload, { headers: this.headers() }).pipe(
      catchError((err) => { console.error('[Svc] POST grades/tareas ERROR ->', err); throw err; })
    );
  }

  upsertQuizCalificacion(payload: { estudiante_username: string; unidad_id: number; quiz_id: number; score: number }): Observable<{ id: number; score: number }> {
    return this.http.post<{ id: number; score: number }>(`${this.base}/grades/quizzes`, payload, { headers: this.headers() }).pipe(
      catchError((err) => { console.error('[Svc] POST grades/quizzes ERROR ->', err); throw err; })
    );
  }

  getUnidadGradeDetalle(username: string, unidadId: number): Observable<any> {
    return this.http.get<any>(`${this.base}/grades/estudiantes/${encodeURIComponent(username)}/unidades/${unidadId}`, { headers: this.headers() }).pipe(
      catchError((err) => { console.error('[Svc] GET unidad grade detalle ERROR ->', err); throw err; })
    );
  }

  

  listarUnidadesHabilitadas(username: string): Observable<Array<{ id: number; nombre: string }>> {
    return this.http.get<Array<{ id: number; nombre: string }>>(
      `${this.base}/estudiantes/${encodeURIComponent(username)}/unidades`, { headers: this.headers() }
    ).pipe(catchError(err => { console.error('[Svc] GET unidades habilitadas ERROR ->', err); throw err; }));
  }

  estadoUnidadesEstudiante(username: string): Observable<Array<{ id: number; nombre?: string; habilitada: boolean }>> {
    return this.http.get<Array<{ id: number; nombre?: string; habilitada: boolean }>>(
      `${this.base}/estudiantes/${encodeURIComponent(username)}/unidades/estado`, { headers: this.headers() }
    ).pipe(catchError(err => { console.error('[Svc] GET estado unidades estudiante ERROR ->', err); throw err; }));
  }

  upsertUnidadCalificacionFinal(payload: { estudiante_username: string; unidad_id: number; score?: number | null; aprobado?: boolean | null }): Observable<{ id: number; score: number | null; aprobado: boolean | null }> {
    return this.http.post<{ id: number; score: number | null; aprobado: boolean | null }>(`${this.base}/grades/unidad/final`, payload, { headers: this.headers() }).pipe(
      catchError((err) => { console.error('[Svc] POST grades/unidad/final ERROR ->', err); throw err; })
    );
  }

  listarTareasCalificaciones(username: string): Observable<Array<{ id: number; unidad_id: number; unidad_nombre?: string; filename: string; score: number; updated_at?: string }>> {
    return this.http.get<Array<{ id: number; unidad_id: number; unidad_nombre?: string; filename: string; score: number; updated_at?: string }>>(
      `${this.base}/grades/estudiantes/${encodeURIComponent(username)}/tareas`, { headers: this.headers() }
    ).pipe(catchError(err => { console.error('[Svc] GET grades tareas ERROR ->', err); throw err; }));
  }

  listarQuizzesCalificaciones(username: string): Observable<Array<{ id: number; unidad_id: number; unidad_nombre?: string; quiz_id: number; quiz_titulo?: string; score: number; updated_at?: string }>> {
    return this.http.get<Array<{ id: number; unidad_id: number; unidad_nombre?: string; quiz_id: number; quiz_titulo?: string; score: number; updated_at?: string }>>(
      `${this.base}/grades/estudiantes/${encodeURIComponent(username)}/quizzes`, { headers: this.headers() }
    ).pipe(catchError(err => { console.error('[Svc] GET grades quizzes ERROR ->', err); throw err; }));
  }

  listarUnidadesFinales(username: string): Observable<Array<{ id: number; unidad_id: number; unidad_nombre?: string; score: number | null; aprobado: boolean | null; updated_at?: string }>> {
    return this.http.get<Array<{ id: number; unidad_id: number; unidad_nombre?: string; score: number | null; aprobado: boolean | null; updated_at?: string }>>(
      `${this.base}/grades/estudiantes/${encodeURIComponent(username)}/unidades/finales`, { headers: this.headers() }
    ).pipe(catchError(err => { console.error('[Svc] GET grades unidades finales ERROR ->', err); throw err; }));
  }
}
