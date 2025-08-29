import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <-- Importa FormsModule aquí
import { Router, RouterModule } from '@angular/router'; // <-- Agrega RouterModule si no está
import { HttpClient } from '@angular/common/http';

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

  // Inyecta el Router y el HttpClient para hacer peticiones
  constructor(private http: HttpClient, private router: Router) {}

  onSubmit(): void {
    const userData = {
      username: this.username,
      password: this.password
    };

    // Realiza la petición POST al backend
    this.http.post('http://localhost:8000/auth/login', userData)
      .subscribe({
        next: (response: any) => {
          this.message = 'Inicio de sesión exitoso.';
          // Guarda solo el usuario en localStorage
          localStorage.setItem('user', JSON.stringify(response.usuario));
          // Redirige según el tipo de usuario actualizado
          if (response.tipo_usuario === 'estudiante') {
            this.router.navigate(['/dashboard-estudiante']);
          } else if (response.tipo_usuario === 'profesor') {
            this.router.navigate(['/dashboard-profesor']);
          } else if (response.tipo_usuario === 'empresa') {
            this.router.navigate(['/dashboard-empresa']);
          } else {
            this.router.navigate(['/dashboard']); // Fallback
          }
        },
        error: (error) => {
          // Muestra un mensaje de error si el login falla
          this.message = 'Error al iniciar sesión. Por favor, revisa tus credenciales.';
          console.error('Login error:', error);
        }
      });
  }
}
