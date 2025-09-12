import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Necesario para directivas comunes (*ngIf, *ngFor)
import { RouterOutlet, RouterLink } from '@angular/router'; // Para el enrutamiento

@Component({
  selector: 'app-root', // Este es el selector que se usa en index.html
  standalone: true, // ¡IMPORTANTE! Indica que es un componente independiente
  imports: [CommonModule, RouterOutlet, RouterLink], // Importa los módulos necesarios
  templateUrl: './app.html', // Ruta a su propia plantilla HTML
  styleUrls: ['./app.css'] // Ruta a sus propios estilos CSS/SCSS
})
export class AppComponent {
  title = 'DriveFlow App';
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
}