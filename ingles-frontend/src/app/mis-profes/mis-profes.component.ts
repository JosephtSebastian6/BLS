import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MisProfesService, Profesor } from './mis-profes.service';

interface Estudiante {
  identificador: number;
  username: string;
  nombres: string;
  apellidos: string;
  email: string;
  tipo_usuario: string;
}

@Component({
  selector: 'app-mis-profes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mis-profes.component.html',
  styleUrls: ['./mis-profes.component.css']
})
export class MisProfesComponent implements OnInit {
  profesores: Profesor[] = [];
  todosEstudiantes: Estudiante[] = [];
  estudiantesAsignados: Estudiante[] = [];
  profesorSeleccionado: Profesor | null = null;
  mostrarModal = false;
  cargandoEstudiantes = false;
  procesandoAsignacion = false;
  private apiUrl = 'http://localhost:8000/auth';

  constructor(
    private misProfesService: MisProfesService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.cargarProfesores();
    this.cargarTodosEstudiantes();
  }

  cargarProfesores(): void {
    this.misProfesService.getProfesores().subscribe((data) => {
      this.profesores = data;
    });
  }

  cargarTodosEstudiantes(): void {
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get<Estudiante[]>(`${this.apiUrl}/estudiantes`, { headers })
      .subscribe({
        next: (estudiantes) => {
          this.todosEstudiantes = estudiantes;
        },
        error: (error) => {
          console.error('Error cargando estudiantes:', error);
        }
      });
  }

  abrirModalEstudiantes(profesor: Profesor): void {
    this.profesorSeleccionado = profesor;
    this.mostrarModal = true;
    this.cargarEstudiantesAsignados();
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.profesorSeleccionado = null;
    this.estudiantesAsignados = [];
  }

  cargarEstudiantesAsignados(): void {
    if (!this.profesorSeleccionado) return;
    
    this.cargandoEstudiantes = true;
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get<Estudiante[]>(`${this.apiUrl}/profesores/${this.profesorSeleccionado.username}/estudiantes`, { headers })
      .subscribe({
        next: (estudiantes) => {
          this.estudiantesAsignados = estudiantes;
          this.cargandoEstudiantes = false;
        },
        error: (error) => {
          console.error('Error cargando estudiantes asignados:', error);
          this.cargandoEstudiantes = false;
        }
      });
  }

  estaAsignado(estudianteUsername: string): boolean {
    return this.estudiantesAsignados.some(est => est.username === estudianteUsername);
  }

  contarEstudiantesAsignados(profesorUsername: string): number {
    // Esta función se puede optimizar cargando los conteos desde el backend
    return 0; // Por ahora retorna 0, se actualizará con datos reales
  }

  toggleAsignacion(estudianteUsername: string): void {
    if (!this.profesorSeleccionado || this.procesandoAsignacion) return;
    
    this.procesandoAsignacion = true;
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    const estaAsignadoActualmente = this.estaAsignado(estudianteUsername);
    const url = `${this.apiUrl}/profesores/${this.profesorSeleccionado.username}/estudiantes/${estudianteUsername}`;
    
    const request = estaAsignadoActualmente 
      ? this.http.delete(url, { headers })
      : this.http.post(url, {}, { headers });

    request.subscribe({
      next: () => {
        console.log(`Estudiante ${estaAsignadoActualmente ? 'desasignado' : 'asignado'} correctamente`);
        this.cargarEstudiantesAsignados(); // Recargar lista
        this.procesandoAsignacion = false;
      },
      error: (error) => {
        console.error('Error en asignación:', error);
        this.procesandoAsignacion = false;
      }
    });
  }
}
