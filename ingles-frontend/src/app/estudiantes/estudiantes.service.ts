import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Estudiante {
  identificador: number;
  username: string;
  nombres: string;
  apellidos: string;
  email: string;
  numero_identificacion?: string;
  ciudad?: string;
  telefono?: string;
}

@Injectable({ providedIn: 'root' })
export class EstudiantesService {
  private apiUrl = `${environment.apiUrl}/auth/estudiantes-disponibles`;

  constructor(private http: HttpClient) {}

  getEstudiantes(): Observable<Estudiante[]> {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const headers: HttpHeaders = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();

    return this.http.get<Estudiante[]>(this.apiUrl, { headers });
  }
}
