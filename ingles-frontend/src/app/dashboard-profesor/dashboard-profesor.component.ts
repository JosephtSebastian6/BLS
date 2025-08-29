import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterOutlet } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { LayoutProfesorComponent } from '../layout-profesor/layout-profesor.component';

@Component({
  selector: 'app-dashboard-profesor',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterOutlet, LayoutProfesorComponent],
  templateUrl: './dashboard-profesor.component.html',
  styleUrls: ['./dashboard-profesor.component.css']
})
export class DashboardProfesorComponent implements OnInit {
  perfil: any = {};
  editandoNombre = false;
  imagenInvalida = false;
  mensajeExito = '';
  clases: any[] = [];

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const username = user.username;
    if (username) {
      this.http.get<any>(`http://localhost:8000/auth/profesor/${username}`)
        .subscribe({
          next: (data) => {
            this.perfil = data;
          },
          error: (err) => {
            this.perfil = {};
          }
        });
      // Obtener clases del profesor
      this.http.get<any[]>(`http://localhost:8000/auth/clases-profesor/${username}`)
        .subscribe({
          next: (data) => {
            this.clases = data;
          },
          error: () => {
            this.clases = [];
          }
        });
    }
  }

  logout() {
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  irAMisClases() {
    this.router.navigate(['/mis-clases']);
  }

  onImagenError() {
    this.imagenInvalida = true;
  }

  onImagenInputChange() {
    this.imagenInvalida = false;
  }

  onSubmit() {
    // Llama al endpoint para actualizar el perfil
    this.http.put<any>('http://localhost:8000/auth/update-perfil', this.perfil)
      .subscribe({
        next: (data) => {
          this.perfil = data; // Actualiza el perfil con la respuesta del backend
          this.mensajeExito = '¡Cambios guardados correctamente!';
          setTimeout(() => this.mensajeExito = '', 2500);
        },
        error: (err) => {
          this.mensajeExito = 'Error al guardar los cambios.';
          setTimeout(() => this.mensajeExito = '', 2500);
        }
      });
  }

  agendarEstudiante(clase: any) {
    // Aquí puedes abrir un modal o redirigir a la funcionalidad de agendar estudiante
    alert('Funcionalidad para agendar estudiante en la clase: ' + clase.tema);
  }

  cancelarClase(clase: any) {
    if (confirm('¿Seguro que deseas cancelar esta clase?')) {
      this.http.delete(`http://localhost:8000/auth/clase/${clase.id}`)
        .subscribe({
          next: () => {
            this.clases = this.clases.filter(c => c.id !== clase.id);
          },
          error: () => {
            alert('No se pudo cancelar la clase.');
          }
        });
    }
  }
}
