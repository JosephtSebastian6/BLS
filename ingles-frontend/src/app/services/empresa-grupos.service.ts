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

  listarUnidades(): Observable<Array<{ id: number; nombre: string }>> {
    return this.http.get<Array<{ id: number; nombre: string }>>(`${this.base}/unidades/`, { headers: this.headers() });
  }

  // ===== Grupos por profesor =====
  listarGruposPorProfesor(profesorUsername: string): Observable<any[]> {
    const headers = this.headers();
    // 1) Intentar endpoint RESTful por profesor
    return this.http.get<any[]>(`${this.base}/profesores/${encodeURIComponent(profesorUsername)}/grupos`, { headers }).pipe(
      catchError(() => {
        // 2) Fallback: endpoint general con query param
        const params = new HttpParams().set('profesor_username', profesorUsername);
        return this.http.get<any[]>(`${this.base}/grupos`, { headers, params }).pipe(
          catchError(() => of([]))
        );
      })
    );
  }

  deleteGrupo(grupoId: number): Observable<any> {
    return this.http.delete(`${this.base}/grupos/${grupoId}`, { headers: this.headers() });
  }
}
