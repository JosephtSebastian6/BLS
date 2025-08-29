import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private apiUrl = 'http://localhost:8000/auth/estudiantes-disponibles';

  constructor(private http: HttpClient) {}

  getEstudiantes(): Observable<Estudiante[]> {
    return this.http.get<Estudiante[]>(this.apiUrl);
  }
}
