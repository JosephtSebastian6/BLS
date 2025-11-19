import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { QuizzesService, QuizResponse } from '../services/quizzes.service';

@Component({
  selector: 'app-evaluaciones-lista-estudiante',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="card">
    <div class="card-header">
      <h2>Evaluaciones disponibles</h2>
      <button type="button" class="btn-outline" (click)="verCalificaciones()">
        Ver Mis Calificaciones
      </button>
    </div>
    <div class="card-body">
      <div *ngIf="loading">Cargando…</div>
      <div *ngIf="!loading && !items.length" class="empty">No hay evaluaciones disponibles.</div>
      <div class="grid" *ngIf="items.length">
        <div class="quiz clickable" *ngFor="let q of items" (click)="ver(q)" tabindex="0" role="button">
          <div class="quiz-head">
            <h3>{{ q.titulo }}</h3>
            <span class="tag">Unidad {{ q.unidad_id }}</span>
          </div>
          <p class="desc">{{ q.descripcion || 'Sin descripción' }}</p>
          <button type="button" class="btn" (click)="ver(q); $event.stopPropagation();">Ver</button>
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
    .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
    .quiz{border:1px solid #e5e7eb;border-radius:14px;padding:12px;background:#fafafa;position:relative}
    .quiz.clickable{cursor:pointer}
    .quiz.clickable:hover{box-shadow:0 8px 24px rgba(0,0,0,.08)}
    .quiz-head{display:flex;align-items:center;justify-content:space-between}
    .tag{background:#eef2ff;color:#3730a3;border-radius:999px;padding:2px 8px;font-size:.8rem}
    .btn{margin-top:8px;display:inline-block;background:linear-gradient(135deg,var(--primary,#667eea),var(--secondary,#764ba2));color:#fff;border:none;border-radius:10px;padding:.5rem .8rem;text-decoration:none;cursor:pointer;position:relative;z-index:2;pointer-events:auto}
    .empty{color:#6b7280}
  `]
})
export class EvaluacionesListaEstudianteComponent implements OnInit {
  items: QuizResponse[] = [];
  loading = false;
  constructor(private api: QuizzesService, private route: ActivatedRoute, private router: Router) {}
  ngOnInit(){
    this.loading = true;
    this.api.listarDisponiblesEstudiante().subscribe({
      next: r => { this.items = r; this.loading = false; },
      error: _ => { this.loading = false; }
    });
  }
  ver(q: QuizResponse){
    console.log('Ir a evaluación', q.id);
    this.router.navigateByUrl(`/dashboard-estudiante/evaluaciones/${q.id}`);
  }
  
  verCalificaciones(){
    this.router.navigateByUrl('/dashboard-estudiante/evaluaciones/calificaciones');
  }
}
