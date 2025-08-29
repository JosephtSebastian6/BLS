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

  cerrarSesion() {
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
}