import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ProfesorTareasService } from '../services/profesor-tareas.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tareas-profesor',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './tareas-profesor.component.html',
  styleUrls: ['./tareas-profesor.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TareasProfesorComponent implements OnInit {
  unidadId: number | null = null;
  desde = '';
  hasta = '';
  loading = false;
  error = '';
  profesorUsername = '';
  data: Array<{ estudiante_username: string; nombres: string; apellidos: string; tareas: any[] }> = [];

  constructor(private svc: ProfesorTareasService, private cdr: ChangeDetectorRef, private router: Router) {}

  ngOnInit(): void {
    const username = localStorage.getItem('username');
    if (username) this.profesorUsername = username;
    const hoy = new Date();
    const hace30 = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
    this.desde = hace30.toISOString().slice(0, 10);
    this.hasta = hoy.toISOString().slice(0, 10);
    this.buscar();
  }

  buscar() {
    if (!this.profesorUsername) { this.error = 'No se encontró el usuario profesor'; return; }
    this.loading = true;
    this.error = '';
    this.svc.getTareasAsignadas(this.profesorUsername, {
      unidadId: this.unidadId ?? undefined,
      desde: this.desde || undefined,
      hasta: this.hasta || undefined,
    }).subscribe({
      next: (rows) => {
        this.data = rows || [];
        // Enriquecer cada tarea con su nota
        for (const e of this.data) {
          for (const t of (e.tareas || [])) {
            if (!t || !t.filename || t.filename === 'grades.json') continue;
            this.svc.getGrade(this.profesorUsername, e.estudiante_username, t.unidad_id, t.filename)
              .subscribe({
                next: (g) => { (t as any)._grade = (g?.score ?? null); this.cdr.markForCheck(); },
                error: () => { (t as any)._grade = null; this.cdr.markForCheck(); }
              });
          }
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (e) => { this.error = 'No se pudo cargar el listado'; this.loading = false; console.error(e); this.cdr.markForCheck(); }
    });
  }

  descargar(estUsername: string, unidadId: number, filename: string) {
    this.svc.download(this.profesorUsername, estUsername, unidadId, filename);
  }

  calificar(estUsername: string, unidadId: number, filename: string) {
    this.router.navigate(['/dashboard-profesor/calificar'], {
      queryParams: {
        estudiante: estUsername,
        unidad: unidadId,
        tipo: 'tarea',
        filename
      }
    });
  }

  // Métodos helper para el template
  getTotalTareas(): number {
    return this.data.reduce((total, estudiante) => {
      return total + (estudiante.tareas?.filter(t => t.filename !== 'grades.json').length || 0);
    }, 0);
  }

  getTareasCalificadas(): number {
    return this.data.reduce((total, estudiante) => {
      return total + (estudiante.tareas?.filter(t => 
        t.filename !== 'grades.json' && (t as any)._grade !== null && (t as any)._grade !== undefined
      ).length || 0);
    }, 0);
  }

  getValidTareas(tareas: any[]): any[] {
    return tareas?.filter(t => t.filename !== 'grades.json') || [];
  }

  getInitials(nombres: string, apellidos: string): string {
    const n = nombres?.charAt(0)?.toUpperCase() || '?';
    const a = apellidos?.charAt(0)?.toUpperCase() || '';
    return n + a;
  }

  getGradeClass(grade: any): string {
    if (grade === null || grade === undefined) return 'grade-none';
    const numGrade = Number(grade);
    if (numGrade >= 80) return 'grade-high';
    if (numGrade >= 60) return 'grade-medium';
    return 'grade-low';
  }

  getGradeDisplay(grade: any): string {
    if (grade === null || grade === undefined) return 'Sin calificar';
    return `${grade}/100`;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Sin fecha';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Métodos de tracking para optimización
  trackByEstudiante(index: number, estudiante: any): string {
    return estudiante.estudiante_username;
  }

  trackByTarea(index: number, tarea: any): string {
    return `${tarea.unidad_id}-${tarea.filename}`;
  }
}
