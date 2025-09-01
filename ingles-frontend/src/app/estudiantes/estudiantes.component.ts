import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EstudiantesService, Estudiante } from './estudiantes.service';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Unidad {
  id: number;
  nombre: string;
  descripcion: string;
  orden: number;
  habilitada: boolean;
}

@Component({
  selector: 'app-estudiantes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './estudiantes.component.html',
  styleUrls: ['./estudiantes.component.css']
})
export class EstudiantesComponent implements OnInit {
  estudiantes: Estudiante[] = [];
  estudiantesFiltrados: Estudiante[] = [];
  busqueda: string = '';
  
  // Variables para modal de unidades
  mostrarModalUnidades = false;
  estudianteSeleccionado: Estudiante | null = null;
  unidadesEstudiante: Unidad[] = [];
  cargandoUnidades = false;
  cargandoUnidad: number | null = null;

  constructor(
    private estudiantesService: EstudiantesService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.estudiantesService.getEstudiantes().subscribe((data) => {
      this.estudiantes = data;
      this.estudiantesFiltrados = data;
    });
  }

  filtrarEstudiantes(): void {
    const filtro = this.busqueda.trim().toLowerCase();
    if (!filtro) {
      this.estudiantesFiltrados = this.estudiantes;
      return;
    }
    this.estudiantesFiltrados = this.estudiantes.filter(est =>
      est.nombres.toLowerCase().includes(filtro) ||
      est.apellidos.toLowerCase().includes(filtro) ||
      est.email.toLowerCase().includes(filtro) ||
      est.username.toLowerCase().includes(filtro)
    );
  }

  abrirModalUnidades(estudiante: Estudiante): void {
    this.estudianteSeleccionado = estudiante;
    this.mostrarModalUnidades = true;
    this.cargarUnidadesEstudiante(estudiante.username);
  }

  cerrarModalUnidades(): void {
    this.mostrarModalUnidades = false;
    this.estudianteSeleccionado = null;
    this.unidadesEstudiante = [];
  }

  cargarUnidadesEstudiante(username: string): void {
    this.cargandoUnidades = true;
    const token = localStorage.getItem('token');
    
    this.http.get<Unidad[]>(`http://localhost:8000/auth/estudiantes/${username}/unidades`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (unidades) => {
        this.unidadesEstudiante = unidades;
        this.cargandoUnidades = false;
      },
      error: (error) => {
        console.error('Error cargando unidades:', error);
        this.cargandoUnidades = false;
      }
    });
  }

  toggleUnidadEstudiante(unidadId: number): void {
    if (!this.estudianteSeleccionado) return;
    
    this.cargandoUnidad = unidadId;
    const token = localStorage.getItem('token');
    
    this.http.put(`http://localhost:8000/auth/estudiantes/${this.estudianteSeleccionado.username}/unidades/${unidadId}/toggle`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (response: any) => {
        // Actualizar estado local
        const unidad = this.unidadesEstudiante.find(u => u.id === unidadId);
        if (unidad) {
          unidad.habilitada = response.habilitada;
        }
        this.cargandoUnidad = null;
      },
      error: (error) => {
        console.error('Error toggling unidad:', error);
        this.cargandoUnidad = null;
      }
    });
  }
}
