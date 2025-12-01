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
    .card{max-width:1320px;margin:2.5rem auto;background:rgba(255,255,255,0.96);border:1px solid rgba(148,163,184,.35);border-radius:20px;box-shadow:0 18px 45px rgba(15,23,42,.18);backdrop-filter:blur(10px)}
    .card-header{display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.75rem;border-bottom:1px solid rgba(226,232,240,.9)}
    .card-header h2{margin:0;font-size:1.35rem;font-weight:600;color:#0f172a}
    .card-body{padding:1.5rem 1.75rem 1.75rem}
    .btn-outline{border:1px solid #cbd5e1;background:#fff;color:#111827;border-radius:999px;padding:.55rem 1rem;text-decoration:none;cursor:pointer;font-size:.9rem;font-weight:500;box-shadow:0 1px 2px rgba(15,23,42,.08);transition:background-color .15s ease,color .15s ease,box-shadow .15s ease,transform .15s ease}
    .btn-outline:hover{background:#111827;color:#f9fafb;box-shadow:0 4px 14px rgba(15,23,42,.25);transform:translateY(-1px)}
    .empty{color:#6b7280;text-align:center;padding:2.5rem 1rem;font-size:.95rem}
    .calificaciones-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.2rem;margin-bottom:2rem;margin-top:.75rem}
    .calificacion-item{border:1px solid rgba(226,232,240,0.95);border-radius:16px;padding:1rem 1.1rem;background:linear-gradient(135deg,#f9fafb,#eff6ff);box-shadow:0 10px 30px rgba(15,23,42,.06);position:relative;overflow:hidden;transition:box-shadow .18s ease,transform .18s ease,border-color .18s ease,background .18s ease}
    .calificacion-item::before{content:"";position:absolute;inset:-40%;background:radial-gradient(circle at top left,rgba(45,212,191,.38),transparent 55%);opacity:0;transition:opacity .25s ease;pointer-events:none}
    .calificacion-item:hover{transform:translateY(-3px);box-shadow:0 18px 45px rgba(15,23,42,.12);border-color:rgba(148,163,184,.8)}
    .calificacion-item:hover::before{opacity:1}
    .calificacion-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.35rem;gap:.75rem}
    .calificacion-header h3{margin:0;font-size:1.05rem;font-weight:600;color:#0f172a}
    .score{font-weight:600;font-size:1rem;padding:4px 10px;border-radius:999px;background:#e5e7eb;color:#111827;min-width:80px;text-align:center;white-space:nowrap}
    .score.aprobado{background:#dcfce7;color:#166534}
    .score.reprobado{background:#fee2e2;color:#b91c1c}
    .calificacion-info p{margin:0.25rem 0;font-size:0.9rem;color:#374151}
    .aprobado{color:#166534}
    .reprobado{color:#b91c1c}
    .badge-manual{font-size:0.8rem;color:#0369a1;margin-left:0.25rem}
    .comentario{display:block;margin-top:0.15rem;color:#111827;font-size:0.9rem}
    .resumen{border-top:1px solid #e5e7eb;padding-top:1.5rem;margin-top:.5rem}
    .resumen h3{margin-bottom:1rem;font-size:1.1rem;font-weight:600;color:#0f172a}
    .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem}
    .stat{display:flex;justify-content:space-between;align-items:center;padding:.65rem 1.1rem;background:#f8fafc;border-radius:12px;border:1px solid #e5e7eb}
    .stat .label{font-weight:500;color:#4b5563;font-size:0.9rem}
    .stat .value{font-weight:700;color:#111827}
    .stat .value.aprobado{color:#16a34a}
    .stat .value.reprobado{color:#dc2626}
    @media (max-width:1024px){.calificaciones-grid{grid-template-columns:repeat(1,minmax(0,1fr))}}
    @media (max-width:640px){.card{margin:1.5rem .75rem}.card-header,.card-body{padding:1rem 1.1rem}.card-header h2{font-size:1.2rem}}
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
