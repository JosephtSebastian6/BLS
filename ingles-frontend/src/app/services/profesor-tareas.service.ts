import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProfesorTareasService {
  private baseUrl = 'http://localhost:8000/auth';
  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
    let h = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) h = h.set('Authorization', `Bearer ${token}`);
    return h;
  }

  getTareasAsignadas(profesorUsername: string, opts?: { unidadId?: number; desde?: string; hasta?: string }): Observable<any[]> {
    let params = new HttpParams();
    if (opts?.unidadId != null) params = params.set('unidad_id', String(opts.unidadId));
    if (opts?.desde) params = params.set('desde', opts.desde);
    if (opts?.hasta) params = params.set('hasta', opts.hasta);
    return this.http.get<any[]>(`${this.baseUrl}/profesores/${encodeURIComponent(profesorUsername)}/tareas`, {
      headers: this.headers(),
      params
    });
  }

  getTareasDeEstudiante(profesorUsername: string, estudianteUsername: string, opts?: { unidadId?: number; desde?: string; hasta?: string }): Observable<any> {
    let params = new HttpParams();
    if (opts?.unidadId != null) params = params.set('unidad_id', String(opts.unidadId));
    if (opts?.desde) params = params.set('desde', opts.desde);
    if (opts?.hasta) params = params.set('hasta', opts.hasta);
    return this.http.get<any>(`${this.baseUrl}/profesores/${encodeURIComponent(profesorUsername)}/estudiantes/${encodeURIComponent(estudianteUsername)}/tareas`, {
      headers: this.headers(),
      params
    });
  }

  download(profesorUsername: string, estudianteUsername: string, unidadId: number, filename: string): void {
    const url = `${this.baseUrl}/profesores/${encodeURIComponent(profesorUsername)}/tareas/download`+
      `?estudiante_username=${encodeURIComponent(estudianteUsername)}&unidad_id=${unidadId}&filename=${encodeURIComponent(filename)}`;
    this.http.get(url, { headers: this.headers(), responseType: 'blob' as 'json' }).subscribe({
      next: (blobAny) => {
        const blob = blobAny as Blob;
        const link = document.createElement('a');
        const objectUrl = window.URL.createObjectURL(blob);
        link.href = objectUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(objectUrl);
        link.remove();
      },
      error: (e) => {
        console.error('Error descargando archivo', e);
        alert('No se pudo descargar el archivo. Verifica que el estudiante esté asignado y tu sesión de profesor esté activa.');
      }
    });
  }

  // Calificar una tarea (0-100)
  grade(profesorUsername: string, estudianteUsername: string, unidadId: number, filename: string, score: number) {
    const url = `${this.baseUrl}/profesores/${encodeURIComponent(profesorUsername)}/estudiantes/${encodeURIComponent(estudianteUsername)}/unidades/${unidadId}/grade`;
    const body = { filename, score };
    return this.http.post(url, body, { headers: this.headers() });
  }

  // Bonus por asistencia: sumar minutos y/o puntos a la unidad
  attendanceBonus(profesorUsername: string, estudianteUsername: string, unidadId: number, addMin?: number, addScore?: number) {
    const url = `${this.baseUrl}/profesores/${encodeURIComponent(profesorUsername)}/estudiantes/${encodeURIComponent(estudianteUsername)}/unidades/${unidadId}/attendance-bonus`;
    const body: any = { add_min: addMin ?? 0, add_score: addScore ?? 0 };
    return this.http.post(url, body, { headers: this.headers() });
  }

  // Obtener calificación de un archivo (puede ser null si no existe)
  getGrade(profesorUsername: string, estudianteUsername: string, unidadId: number, filename: string) {
    const url = `${this.baseUrl}/profesores/${encodeURIComponent(profesorUsername)}/estudiantes/${encodeURIComponent(estudianteUsername)}/unidades/${unidadId}/grade`;
    const params = { filename } as any;
    return this.http.get<{ score: number | null }>(url, { headers: this.headers(), params });
  }
}
