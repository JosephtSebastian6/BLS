import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface AsistenciaRegistro {
  claseId: number;
  fechaISO?: string; // opcional por si se quiere versionar por fecha
  presentes: string[]; // emails o ids de estudiantes presentes
  // Nuevos campos opcionales por estudiante (0/1)
  participacion?: { [id: string]: number };
  camara?: { [id: string]: number };
  act_fuera_clase?: { [id: string]: number };
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
    return this.http
      .get<any>(`${this.baseUrl}/auth/empresa/clases`, {
        headers: this.getHeaders(),
        params
      })
      .pipe(
        map((res: any) => {
          // Compatibilidad: si el backend devuelve un array directo, usarlo;
          // si devuelve un objeto con campo 'clases', extraerlo.
          if (Array.isArray(res)) return res;
          if (res && Array.isArray(res.clases)) return res.clases;
          return [];
        })
      );
  }

  getAsistenciaEmpresa(claseId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/auth/empresa/clases/${claseId}/asistencia`, {
      headers: this.getHeaders()
    });
  }

  getEmpresaReporteMensual(anio: number, mes: number): Observable<any> {
    const params: any = { anio: String(anio), mes: String(mes) };
    return this.http.get<any>(`${this.baseUrl}/auth/empresa/asistencias/mensual`, {
      headers: this.getHeaders(),
      params
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

  // Resumen de asistencia del estudiante autenticado
  getAsistenciaResumenEstudiante(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/auth/estudiantes/asistencia-resumen`, {
      headers: this.getHeaders()
    });
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
