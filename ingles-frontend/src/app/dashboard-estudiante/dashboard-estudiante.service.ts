import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardEstudianteService {
  private apiUrl = `${environment.apiUrl}/auth/update-perfil`; // URL correcta del backend

  constructor(private http: HttpClient) {}

  actualizarPerfil(perfil: any): Observable<any> {
    return this.http.put(this.apiUrl, perfil);
  }
}
