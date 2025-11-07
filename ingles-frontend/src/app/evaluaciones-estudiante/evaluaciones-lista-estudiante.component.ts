import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { QuizzesService, QuizResponse } from '../services/quizzes.service';

@Component({
  selector: 'app-evaluaciones-lista-estudiante',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="card">
    <div class="card-header">
      <h2>Evaluaciones disponibles</h2>
    </div>
    <div class="card-body">
      <div *ngIf="loading">Cargando…</div>
      <div *ngIf="!loading && !items.length" class="empty">No hay evaluaciones disponibles.</div>
      <div class="grid" *ngIf="items.length">
        <div class="quiz" *ngFor="let q of items">
          <div class="quiz-head">
            <h3>{{ q.titulo }}</h3>
            <span class="tag">Unidad {{ q.unidad_id }}</span>
          </div>
          <p class="desc">{{ q.descripcion || 'Sin descripción' }}</p>
          <a class="btn" [routerLink]="['/dashboard-estudiante/evaluaciones', q.id]">Ver</a>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .card{max-width:1100px;margin:2rem auto;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.06)}
    .card-header{padding:1rem 1.25rem;border-bottom:1px solid rgba(0,0,0,.06)}
    .card-body{padding:1rem 1.25rem}
    .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
    .quiz{border:1px solid #e5e7eb;border-radius:14px;padding:12px;background:#fafafa}
    .quiz-head{display:flex;align-items:center;justify-content:space-between}
    .tag{background:#eef2ff;color:#3730a3;border-radius:999px;padding:2px 8px;font-size:.8rem}
    .btn{margin-top:8px;display:inline-block;background:linear-gradient(135deg,var(--primary,#667eea),var(--secondary,#764ba2));color:#fff;border:none;border-radius:10px;padding:.5rem .8rem;text-decoration:none}
    .empty{color:#6b7280}
  `]
})
export class EvaluacionesListaEstudianteComponent implements OnInit {
  items: QuizResponse[] = [];
  loading = false;
  constructor(private api: QuizzesService) {}
  ngOnInit(){
    this.loading = true;
    this.api.listarDisponiblesEstudiante().subscribe({
      next: r => { this.items = r; this.loading = false; },
      error: _ => { this.loading = false; }
    });
  }
}
