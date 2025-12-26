import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterOutlet } from '@angular/router';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { LayoutProfesorComponent } from '../layout-profesor/layout-profesor.component';
import { EmpresaGruposService } from '../services/empresa-grupos.service';
import { environment } from '../../environments/environment';

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

  // === Calificaciones ===
  estudiantesAsignados: Array<{ identificador: number; username: string; nombres: string; apellidos: string }> = [];
  unidades: Array<{ id: number; nombre: string }> = [];
  cargandoCalificar = false;
  msgCalificar = '';
  formCalificar: {
    estudiante_username: string;
    unidad_id: number | null;
    tipo: 'tarea' | 'quiz';
    filename: string;
    quiz_id: number | null;
    score: number | null;
  } = { estudiante_username: '', unidad_id: null, tipo: 'tarea', filename: '', quiz_id: null, score: null };

  private backendBase = environment.apiUrl;

  constructor(private router: Router, private http: HttpClient, private gruposSvc: EmpresaGruposService) {}

  ngOnInit() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const username = user.username;
    if (username) {
      this.http.get<any>(`${this.backendBase}/auth/profesor/${username}`)
        .subscribe({
          next: (data) => {
            this.perfil = data;
          },
          error: (err) => {
            this.perfil = {};
          }
        });
      // Obtener clases del profesor
      this.http.get<any[]>(`${this.backendBase}/auth/clases/${username}`)
        .subscribe({
          next: (data) => {
            this.clases = data;
          },
          error: () => {
            this.clases = [];
          }
        });

      // Cargar estudiantes asignados a este profesor
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const headers = token ? new HttpHeaders({ 'Authorization': `Bearer ${token}` }) : undefined;
      this.http.get<Array<{ identificador: number; username: string; nombres: string; apellidos: string }>>(
        `${this.backendBase}/auth/profesores/${encodeURIComponent(username)}/estudiantes`, { headers }
      ).subscribe({
        next: (est) => { this.estudiantesAsignados = est || []; if (!this.formCalificar.estudiante_username && this.estudiantesAsignados[0]) { this.formCalificar.estudiante_username = this.estudiantesAsignados[0].username; } },
        error: () => { this.estudiantesAsignados = []; }
      });

      // Cargar unidades disponibles
      this.gruposSvc.listarUnidades().subscribe({
        next: (u) => { this.unidades = (u as any[])?.map((x: any) => ({ id: x.id, nombre: x.nombre })) || []; if (!this.formCalificar.unidad_id && this.unidades[0]) { this.formCalificar.unidad_id = this.unidades[0].id; } },
        error: () => { this.unidades = []; }
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
    this.http.put<any>(`${this.backendBase}/auth/update-perfil`, this.perfil)
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
      this.http.delete(`${this.backendBase}/auth/clase/${clase.id}`)
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

  // === Acciones de calificación ===
  submitCalificacion(): void {
    this.msgCalificar = '';
    if (!this.formCalificar.estudiante_username || !this.formCalificar.unidad_id || this.formCalificar.score == null) {
      this.msgCalificar = 'Completa estudiante, unidad y score (0-100).';
      return;
    }
    const score = Math.max(0, Math.min(100, Number(this.formCalificar.score)));
    this.cargandoCalificar = true;
    const afterDone = () => { this.cargandoCalificar = false; this.msgCalificar = 'Calificación guardada correctamente.'; setTimeout(() => this.msgCalificar = '', 2500); };
    const onError = (e: any) => { this.cargandoCalificar = false; this.msgCalificar = e?.error?.detail || 'No se pudo guardar la calificación.'; };

    if (this.formCalificar.tipo === 'tarea') {
      if (!this.formCalificar.filename?.trim()) { this.msgCalificar = 'Ingresa el nombre del archivo (tarea).'; this.cargandoCalificar = false; return; }
      this.gruposSvc.upsertTareaCalificacion({
        estudiante_username: this.formCalificar.estudiante_username,
        unidad_id: this.formCalificar.unidad_id!,
        filename: this.formCalificar.filename.trim(),
        score
      }).subscribe({ next: afterDone, error: onError });
    } else {
      if (!this.formCalificar.quiz_id) { this.msgCalificar = 'Ingresa el ID del quiz.'; this.cargandoCalificar = false; return; }
      this.gruposSvc.upsertQuizCalificacion({
        estudiante_username: this.formCalificar.estudiante_username,
        unidad_id: this.formCalificar.unidad_id!,
        quiz_id: this.formCalificar.quiz_id!,
        score
      }).subscribe({ next: afterDone, error: onError });
    }
  }
}
