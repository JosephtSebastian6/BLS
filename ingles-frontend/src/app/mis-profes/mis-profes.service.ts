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

  constructor(private http: HttpClient) {}

  getProfesores(): Observable<Profesor[]> {
    return this.http.get<Profesor[]>(this.apiUrl);
  }
}
