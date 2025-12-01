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
    .card{max-width:1320px;margin:2.5rem auto;background:rgba(255,255,255,0.96);border:1px solid rgba(148,163,184,.35);border-radius:20px;box-shadow:0 18px 45px rgba(15,23,42,.18);backdrop-filter:blur(10px)}
    .card-header{display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.75rem;border-bottom:1px solid rgba(226,232,240,.9)}
    .card-header h2{margin:0;font-size:1.35rem;font-weight:600;color:#0f172a}
    .card-body{padding:1.5rem 1.75rem 1.75rem}
    .btn-outline{border:1px solid #cbd5e1;background:#fff;color:#111827;border-radius:999px;padding:.55rem 1rem;text-decoration:none;cursor:pointer;font-size:.9rem;font-weight:500;box-shadow:0 1px 2px rgba(15,23,42,.08);transition:background-color .15s ease,color .15s ease,box-shadow .15s ease,transform .15s ease}
    .btn-outline:hover{background:#111827;color:#f9fafb;box-shadow:0 4px 14px rgba(15,23,42,.25);transform:translateY(-1px)}
    .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1.2rem;margin-top:.75rem}
    .quiz{border:1px solid rgba(226,232,240,0.95);border-radius:16px;padding:1rem 1.05rem;background:linear-gradient(135deg,#f9fafb,#eef2ff);position:relative;overflow:hidden;transition:box-shadow .18s ease,transform .18s ease,border-color .18s ease,background .18s ease}
    .quiz::before{content:"";position:absolute;inset:-40%;background:radial-gradient(circle at top left,rgba(129,140,248,.35),transparent 55%);opacity:0;transition:opacity .25s ease;pointer-events:none}
    .quiz.clickable{cursor:pointer}
    .quiz.clickable:hover{box-shadow:0 18px 45px rgba(79,70,229,.25);transform:translateY(-3px);border-color:rgba(129,140,248,0.8)}
    .quiz.clickable:hover::before{opacity:1}
    .quiz-head{display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem;margin-bottom:.35rem}
    .quiz-head h3{margin:0;font-size:1rem;font-weight:600;color:#111827;line-height:1.3}
    .tag{background:#eef2ff;color:#3730a3;border-radius:999px;padding:3px 9px;font-size:.78rem;font-weight:500;white-space:nowrap}
    .desc{margin:.25rem 0 .6rem;font-size:.88rem;color:#4b5563;min-height:2.4em}
    .btn{margin-top:.25rem;display:inline-flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--primary,#6366f1),var(--secondary,#8b5cf6));color:#fff;border:none;border-radius:999px;padding:.45rem .9rem;text-decoration:none;cursor:pointer;font-size:.85rem;font-weight:500;box-shadow:0 10px 25px rgba(79,70,229,.35);transition:transform .15s ease,box-shadow .15s ease,filter .15s ease}
    .btn:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(79,70,229,.4);filter:brightness(1.03)}
    .empty{color:#6b7280;text-align:center;padding:2.5rem 1rem;font-size:.95rem}
    @media (max-width:1024px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media (max-width:640px){.card{margin:1.5rem .75rem}.card-header,.card-body{padding:1rem 1.1rem}.card-header h2{font-size:1.2rem}.grid{grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}}
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
