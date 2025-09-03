import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResumenResponse {
  progreso_general: number;
  unidades_completadas: number;
  tiempo_dedicado_min: number;
  racha_dias: number;
}

export interface UnidadAnalytics {
  unidad_id: number;
  tiempo_dedicado_min: number;
  actividades_completadas: number;
  ultima_actividad: string;
  progreso_porcentaje: number;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private base = 'http://localhost:8000/auth';
  constructor(private http: HttpClient) {}

  private headers() {
    // Preferimos el 'access_token' devuelto por backend; mantenemos compatibilidad con 'token'
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    let headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return { headers: new HttpHeaders(headers) };
  }

  getEstudiantesUsernames() {
    return this.http.get<any[]>(`${this.base}/estudiantes`, this.headers());
  }

  getResumen(username: string): Observable<ResumenResponse> {
    return this.http.get<ResumenResponse>(`${this.base}/analytics/estudiantes/${encodeURIComponent(username)}/resumen`, this.headers());
    }

  getUnidades(username: string): Observable<UnidadAnalytics[]> {
    return this.http.get<UnidadAnalytics[]>(`${this.base}/analytics/estudiantes/${encodeURIComponent(username)}/unidades`, this.headers());
  }

  trackingStart(unidad_id: number) {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    console.log('🔍 DEBUG trackingStart: Token disponible:', !!token);
    if (token) {
      console.log('🔍 DEBUG trackingStart: Token preview:', token.substring(0, 20) + '...');
    }
    return this.http.post(`${this.base}/tracking/start`, { unidad_id }, this.headers());
  }

  trackingHeartbeat(unidad_id: number, duracion_min: number) {
    return this.http.post(`${this.base}/tracking/heartbeat`, { unidad_id, duracion_min }, this.headers());
  }

  trackingEnd(unidad_id: number, duracion_min?: number) {
    return this.http.post(`${this.base}/tracking/end`, { unidad_id, duracion_min }, this.headers());
  }

  upsertProgreso(unidad_id: number, porcentaje_completado?: number, score?: number) {
    const body: any = {};
    if (porcentaje_completado !== undefined) body.porcentaje_completado = porcentaje_completado;
    if (score !== undefined) body.score = score;
    return this.http.put(`${this.base}/progreso/${unidad_id}`, body, this.headers());
  }

  // Sistema EXCLUSIVO para estudiantes - NO interfiere con localStorage de empresa
  uploadStudentFile(unidad_id: number, subcarpeta_nombre: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const headers = new HttpHeaders();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    return this.http.post(`${this.base}/estudiantes/subcarpetas/${unidad_id}/${encodeURIComponent(subcarpeta_nombre)}/upload`, formData, { headers });
  }

  getStudentFiles(unidad_id: number, subcarpeta_nombre: string): Observable<any> {
    return this.http.get(`${this.base}/estudiantes/subcarpetas/${unidad_id}/${encodeURIComponent(subcarpeta_nombre)}/files`, this.headers());
  }

  // Métodos con nombres alternativos para compatibilidad
  subirArchivosSubcarpeta(unidad_id: number, subcarpeta_nombre: string, files: File[]): Observable<any> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
      console.log('🔍 DEBUG: Token enviado:', token.substring(0, 20) + '...');
    } else {
      console.log('❌ DEBUG: No hay token en localStorage');
    }
    
    return this.http.post(`${this.base}/estudiantes/subcarpetas/${unidad_id}/${encodeURIComponent(subcarpeta_nombre)}/upload`, formData, { headers });
  }

  getArchivosSubcarpeta(unidad_id: number, subcarpeta_nombre: string): Observable<any[]> {
    return this.http.get<any>(`${this.base}/estudiantes/subcarpetas/${unidad_id}/${encodeURIComponent(subcarpeta_nombre)}/files`, this.headers())
      .pipe(
        map((response: any) => {
          console.log('🔍 DEBUG: Respuesta del backend:', response);
          return response.files || [];
        })
      );
  }

  getResumenEstudiante(): Observable<ResumenResponse> {
    return this.http.get<ResumenResponse>(`${this.base}/estudiantes/resumen`, this.headers());
  }

  getAnalyticsUnidades(): Observable<UnidadAnalytics[]> {
    return this.http.get<UnidadAnalytics[]>(`${this.base}/estudiantes/analytics/unidades`, this.headers());
  }
}
