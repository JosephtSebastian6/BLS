import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <-- Importa FormsModule aquí
import { Router, RouterModule } from '@angular/router'; // <-- Agrega RouterModule si no está
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  // Asegúrate de que FormsModule esté en imports
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  // Propiedades para enlazar con los campos del formulario
  username: string = '';
  password: string = '';
  // Propiedad para mostrar mensajes al usuario
  message: string = '';
  private backendBase = environment.apiUrl;

  // Inyecta el Router y el HttpClient para hacer peticiones
  constructor(private http: HttpClient, private router: Router) {}

  onSubmit(): void {
    const userData = {
      username: this.username,
      password: this.password
    };

    // Realiza la petición POST al backend
    this.http.post(`${this.backendBase}/auth/login`, userData)
      .subscribe({
        next: (response: any) => {
          this.message = 'Inicio de sesión exitoso.';
          // Guarda el usuario y token en localStorage
          localStorage.setItem('user', JSON.stringify(response.usuario));
          localStorage.setItem('username', response.usuario.username);
          localStorage.setItem('token', response.access_token);
          // Redirige según el tipo de usuario actualizado
          if (response.tipo_usuario === 'estudiante') {
            // Ir directamente a la vista de Análisis del Estudiante dentro del dashboard
            this.router.navigate(['/dashboard-estudiante/analisis-estudiante']);
          } else if (response.tipo_usuario === 'profesor') {
            this.router.navigate(['/dashboard-profesor']);
          } else if (response.tipo_usuario === 'empresa') {
            this.router.navigate(['/dashboard-empresa']);
          } else if (response.tipo_usuario === 'admin') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/dashboard']); // Fallback
          }
        },
        error: (error) => {
          // Maneja diferentes tipos de errores
          if (error.status === 403) {
            // Error 403: Matrícula inactiva
            this.message = error.error.detail || 'Tu matrícula se encuentra inactiva. Contacta con el administrador.';
          } else if (error.status === 400) {
            // Error 400: Credenciales incorrectas
            this.message = 'Credenciales incorrectas. Por favor, revisa tu usuario y contraseña.';
          } else {
            // Otros errores
            this.message = 'Error al iniciar sesión. Por favor, intenta de nuevo.';
          }
          console.error('Login error:', error);
        }
      });
  }
}
