import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CampanaNotificacionesComponent } from './componentes/campana-notificaciones/campana-notificaciones.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, CampanaNotificacionesComponent, DatePipe],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  providers: [DatePipe]
})
export class AppComponent {
  title = 'DriveFlow App';
  constructor(private router: Router) {}
  get isLoggedIn(): boolean {
    return !!localStorage.getItem('user');
  }

  get userRole(): string | null {
    try {
      const user = localStorage.getItem('user');
      if (!user) return null;
      const parsed = JSON.parse(user);
      return parsed?.tipo_usuario || null;
    } catch {
      return null;
    }
  }

  get isAdmin(): boolean {
    // 1) Si el usuario guardado trae rol
    if (this.userRole === 'admin') return true;
    // 2) Fallback: decodificar token JWT
    const token = localStorage.getItem('token');
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload?.tipo_usuario === 'admin';
    } catch {
      return false;
    }
  }

  cerrarSesion() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  // Mostrar botón WhatsApp solo en Home
  get showWhatsApp(): boolean {
    const url = this.router?.url || '';
    // Home puede ser '/'
    return url === '/' || url.startsWith('/home');
  }
}