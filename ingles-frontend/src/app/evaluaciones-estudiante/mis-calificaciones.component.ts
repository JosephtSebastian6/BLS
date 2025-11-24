import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { QuizzesService } from '../services/quizzes.service';

@Component({
  selector: 'app-mis-calificaciones',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="card">
    <div class="card-header">
      <h2>Mis Calificaciones de Evaluaciones</h2>
      <button type="button" class="btn-outline" routerLink="/dashboard-estudiante/evaluaciones">
        Volver a Evaluaciones
      </button>
    </div>
    <div class="card-body">
      <div *ngIf="loading">Cargando calificaciones...</div>
      
      <div *ngIf="!loading && !calificaciones.length" class="empty">
        No tienes calificaciones de evaluaciones aún.
      </div>
      
      <div *ngIf="!loading && calificaciones.length" class="calificaciones-grid">
        <div class="calificacion-item" *ngFor="let cal of calificaciones">
          <div class="calificacion-header">
            <h3>{{ cal.quiz_titulo }}</h3>
            <span class="score" [class.aprobado]="cal.aprobada && cal.score >= 60" [class.reprobado]="cal.aprobada && cal.score < 60">
              <ng-container *ngIf="cal.aprobada && cal.score !== null && cal.score !== undefined; else pendienteScore">
                {{ cal.score }}/100
              </ng-container>
              <ng-template #pendienteScore>
                Pendiente
              </ng-template>
            </span>
          </div>
          <div class="calificacion-info">
            <p><strong>Unidad:</strong> {{ cal.unidad_nombre }}</p>
            <p><strong>Fecha:</strong> {{ cal.updated_at | date:'short' }}</p>
            <p><strong>Estado:</strong> 
              <ng-container *ngIf="cal.aprobada && cal.score !== null && cal.score !== undefined; else pendienteEstado">
                <span [class.aprobado]="cal.score >= 60" [class.reprobado]="cal.score < 60">
                  {{ cal.score >= 60 ? 'Aprobado' : 'Reprobado' }}
                </span>
                <span *ngIf="cal.origen_manual" class="badge-manual"> · Nota manual</span>
              </ng-container>
              <ng-template #pendienteEstado>
                <span>Pendiente de aprobación del profesor</span>
              </ng-template>
            </p>
            <p *ngIf="cal.comentario_profesor">
              <strong>Comentario del profesor:</strong>
              <span class="comentario">{{ cal.comentario_profesor }}</span>
            </p>
          </div>
        </div>
      </div>
      
      <div *ngIf="!loading && calificaciones.length" class="resumen">
        <h3>Resumen General</h3>
        <div class="stats">
          <div class="stat">
            <span class="label">Total Evaluaciones:</span>
            <span class="value">{{ calificaciones.length }}</span>
          </div>
          <div class="stat">
            <span class="label">Aprobadas:</span>
            <span class="value aprobado">{{ aprobadas }}</span>
          </div>
          <div class="stat">
            <span class="label">Reprobadas:</span>
            <span class="value reprobado">{{ reprobadas }}</span>
          </div>
          <div class="stat">
            <span class="label">Promedio:</span>
            <span class="value" [class.aprobado]="promedio >= 60" [class.reprobado]="promedio < 60">
              {{ promedio }}/100
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .card{max-width:1100px;margin:2rem auto;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.06)}
    .card-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid rgba(0,0,0,.06)}
    .card-body{padding:1rem 1.25rem}
    .btn-outline{border:1px solid #cbd5e1;background:#fff;color:#1f2937;border-radius:10px;padding:.5rem .8rem;text-decoration:none;cursor:pointer}
    .empty{color:#6b7280;text-align:center;padding:2rem}
    .calificaciones-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem;margin-bottom:2rem}
    .calificacion-item{border:1px solid #e5e7eb;border-radius:12px;padding:1rem;background:#fafafa}
    .calificacion-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem}
    .calificacion-header h3{margin:0;font-size:1.1rem}
    .score{font-weight:bold;font-size:1.2rem;padding:4px 8px;border-radius:6px}
    .score.aprobado{background:#d1fae5;color:#065f46}
    .score.reprobado{background:#fee2e2;color:#dc2626}
    .calificacion-info p{margin:0.25rem 0;font-size:0.9rem}
    .aprobado{color:#065f46}
    .reprobado{color:#dc2626}
    .badge-manual{font-size:0.8rem;color:#0369a1;margin-left:0.25rem}
    .comentario{display:block;margin-top:0.15rem;color:#374151}
    .resumen{border-top:1px solid #e5e7eb;padding-top:1.5rem}
    .resumen h3{margin-bottom:1rem}
    .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem}
    .stat{display:flex;justify-content:space-between;padding:0.5rem 1rem;background:#f8f9fa;border-radius:8px}
    .stat .label{font-weight:500}
    .stat .value{font-weight:bold}
  `]
})
export class MisCalificacionesComponent implements OnInit {
  calificaciones: any[] = [];
  loading = false;
  
  constructor(private quizzesService: QuizzesService) {}
  
  ngOnInit() {
    this.cargarCalificaciones();
  }
  
  cargarCalificaciones() {
    this.loading = true;
    this.quizzesService.obtenerMisCalificacionesQuizzes().subscribe({
      next: (calificaciones) => {
        this.calificaciones = calificaciones;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar calificaciones:', error);
        this.loading = false;
      }
    });
  }
  
  get aprobadas(): number {
    return this.calificaciones.filter(c => c.aprobada && c.score !== null && c.score !== undefined && c.score >= 60).length;
  }
  
  get reprobadas(): number {
    return this.calificaciones.filter(c => c.aprobada && c.score !== null && c.score !== undefined && c.score < 60).length;
  }
  
  get promedio(): number {
    const aprobadas = this.calificaciones.filter(c => c.aprobada && c.score !== null && c.score !== undefined);
    if (aprobadas.length === 0) return 0;
    const suma = aprobadas.reduce((acc, cal) => acc + (cal.score || 0), 0);
    return Math.round(suma / aprobadas.length);
  }
}
