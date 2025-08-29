import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DashboardEstudianteService {
  private apiUrl = 'http://localhost:8000/auth/update-perfil'; // URL correcta del backend

  constructor(private http: HttpClient) {}

  actualizarPerfil(perfil: any): Observable<any> {
    return this.http.put(this.apiUrl, perfil);
  }
}
