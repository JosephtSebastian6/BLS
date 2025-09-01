import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { forkJoin } from 'rxjs';

interface Estudiante {
  identificador: number;
  username: string;
  nombres: string;
  apellidos: string;
  email: string;
  tipo_usuario: string;
}

interface Clase {
  id: number;
  dia: string;
  hora: string;
  tema: string;
  meet_link: string;
  profesor_username: string;
  profesor_nombres?: string;
  profesor_apellidos?: string;
  estudiantes: any[];
}

interface Matricula {
  id: number;
  estudiante: string;
  email: string;
  curso: string;
  fechaMatricula: string;
  estado: string;
  profesor: string;
  estudianteUsername: string;
  claseId: number;
}

@Component({
  selector: 'app-matriculas',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './matriculas.component.html',
  styleUrls: ['./matriculas.component.css']
})
export class MatriculasComponent implements OnInit {
  matriculas: Matricula[] = [];
  loading = true;
  error = '';
  private apiUrl = 'http://localhost:8000/auth';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.cargarMatriculas();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  cargarMatriculas() {
    this.loading = true;
    this.error = '';

    // Obtener todos los estudiantes registrados en la plataforma
    this.http.get<Estudiante[]>(`${this.apiUrl}/matriculas/`, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (estudiantes) => {
        this.procesarMatriculas(estudiantes);
      },
      error: (error) => {
        console.error('Error cargando estudiantes:', error);
        this.error = 'Error al cargar las matrículas. Por favor, intenta de nuevo.';
        this.loading = false;
      }
    });
  }

  private procesarMatriculas(estudiantes: Estudiante[]) {
    this.matriculas = estudiantes.map((estudiante, index) => ({
      id: index + 1,
      estudiante: `${estudiante.nombres} ${estudiante.apellidos}`,
      email: estudiante.email,
      curso: 'Plataforma de Inglés',
      fechaMatricula: this.generarFechaMatricula(),
      estado: (estudiante as any).matricula_activa ? 'Activa' : 'Inactiva',
      profesor: 'Sistema',
      estudianteUsername: estudiante.username,
      claseId: 0
    }));
    
    this.loading = false;
  }

  private generarFechaMatricula(): string {
    // Generar fecha aleatoria en los últimos 30 días
    const hoy = new Date();
    const diasAtras = Math.floor(Math.random() * 30);
    const fecha = new Date(hoy.getTime() - (diasAtras * 24 * 60 * 60 * 1000));
    return fecha.toISOString().split('T')[0];
  }

  toggleMatricula(username: string) {
    this.http.put(`${this.apiUrl}/matriculas/${username}/toggle`, {}, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (response: any) => {
        // Actualizar el estado local
        const matricula = this.matriculas.find(m => m.estudianteUsername === username);
        if (matricula) {
          matricula.estado = response.matricula_activa ? 'Activa' : 'Inactiva';
        }
      },
      error: (error) => {
        console.error('Error actualizando matrícula:', error);
        this.error = 'Error al actualizar la matrícula.';
      }
    });
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'Activa': return 'estado-activa';
      case 'Pendiente': return 'estado-pendiente';
      case 'Inactiva': return 'estado-inactiva';
      default: return '';
    }
  }

  getMatriculasPorEstado(estado: string): any[] {
    return this.matriculas.filter(m => m.estado === estado);
  }
}
