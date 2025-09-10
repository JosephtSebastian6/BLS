import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Profesor {
  identificador: number;
  username: string;
  nombres: string;
  apellidos: string;
  email: string;
  tipo_usuario: string;
  // Otros campos según UsuarioResponse
}

@Injectable({ providedIn: 'root' })
export class MisProfesService {
  private apiUrl = 'http://localhost:8000/auth/profesor/'; // URL correcta según tu backend
  private baseAuth = 'http://localhost:8000/auth';

  constructor(private http: HttpClient) {}

  getProfesores(): Observable<Profesor[]> {
    return this.http.get<Profesor[]>(this.apiUrl);
  }

  getResumenAsignaciones(username: string): Observable<{ profesor_username: string; grupos_creados: number; grupos_estimados?: number; estudiantes_asignados: number }>
  {
    return this.http.get<{ profesor_username: string; grupos_creados: number; grupos_estimados?: number; estudiantes_asignados: number }>(`${this.baseAuth}/profesores/${username}/resumen-asignaciones`);
  }

  getClases(profesorUsername: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseAuth}/clases/${encodeURIComponent(profesorUsername)}`);
  }

  deleteClase(claseId: number) {
    return this.http.delete(`${this.baseAuth}/clases/${claseId}`);
  }
}
