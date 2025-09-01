import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MatriculaGuard implements CanActivate {
  private apiUrl = 'http://localhost:8000/auth';

  constructor(private http: HttpClient, private router: Router) {}

  canActivate(): Observable<boolean> {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const tipoUsuario = localStorage.getItem('tipo_usuario');

    // Solo aplicar guard a estudiantes
    if (tipoUsuario !== 'estudiante') {
      return of(true);
    }

    if (!token || !username) {
      this.router.navigate(['/login']);
      return of(false);
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.get<any>(`${this.apiUrl}/usuario/${username}`, { headers }).pipe(
      map(usuario => {
        if (usuario.matricula_activa === false) {
          // Redirigir a una página de matrícula inactiva
          this.router.navigate(['/matricula-inactiva']);
          return false;
        }
        return true;
      }),
      catchError(error => {
        console.error('Error verificando matrícula:', error);
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }
}
