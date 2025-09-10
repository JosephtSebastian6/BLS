import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface AsistenciaRegistro {
  claseId: number;
  fechaISO?: string; // opcional por si se quiere versionar por fecha
  presentes: string[]; // emails o ids de estudiantes presentes
}

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private baseUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  // ===== Empresa =====
  getEmpresaClases(desde?: string, hasta?: string): Observable<any[]> {
    const params: any = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    return this.http.get<any[]>(`${this.baseUrl}/auth/empresa/clases`, {
      headers: this.getHeaders(),
      params
    });
  }

  getAsistenciaEmpresa(claseId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/auth/empresa/clases/${claseId}/asistencia`, {
      headers: this.getHeaders()
    });
  }

  // Intenta obtener del backend, si falla usa localStorage
  getAsistencia(claseId: number): Observable<AsistenciaRegistro | null> {
    return this.http
      .get<AsistenciaRegistro>(`${this.baseUrl}/auth/clases/${claseId}/asistencia`, { headers: this.getHeaders() })
      .pipe(
        catchError(() => of(this.getAsistenciaLocal(claseId)))
      );
  }

  saveAsistencia(registro: AsistenciaRegistro): Observable<boolean> {
    return this.http
      .post(`${this.baseUrl}/auth/clases/${registro.claseId}/asistencia`, registro, { headers: this.getHeaders() })
      .pipe(
        map(() => true),
        catchError(() => {
          // Fallback local
          this.saveAsistenciaLocal(registro);
          return of(true);
        })
      );
  }

  // ===== Fallback localStorage =====
  private localKey(claseId: number) { return `asistencia_clase_${claseId}`; }

  private getAsistenciaLocal(claseId: number): AsistenciaRegistro | null {
    const raw = localStorage.getItem(this.localKey(claseId));
    return raw ? (JSON.parse(raw) as AsistenciaRegistro) : null;
    }

  private saveAsistenciaLocal(registro: AsistenciaRegistro): void {
    localStorage.setItem(this.localKey(registro.claseId), JSON.stringify(registro));
  }
}
