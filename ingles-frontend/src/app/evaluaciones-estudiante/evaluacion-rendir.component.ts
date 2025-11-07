import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { QuizzesService, QuizResponse } from '../services/quizzes.service';

@Component({
  selector: 'app-evaluacion-rendir',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <div class="card" *ngIf="quiz">
    <div class="card-header">
      <h2>{{ quiz.titulo }}</h2>
      <a class="btn-outline" [routerLink]="['/dashboard-estudiante/evaluaciones']">Volver</a>
    </div>
    <div class="card-body">
      <p class="desc">{{ quiz.descripcion }}</p>
      <form>
        <div class="q-item" *ngFor="let it of items; let i = index">
          <h3>{{ i+1 }}. {{ it.enunciado }}</h3>
          <ng-container [ngSwitch]="it.tipo">
            <div *ngSwitchCase="'opcion_multiple'">
              <label class="row" *ngFor="let op of it.opciones; let j=index">
                <input type="radio" name="q{{i}}" [(ngModel)]="respuestas[i]" [value]="j" />
                <span>{{ op.texto }}</span>
              </label>
            </div>
            <div *ngSwitchCase="'vf'">
              <label class="row"><input type="radio" name="q{{i}}" [(ngModel)]="respuestas[i]" [value]="true"/> Verdadero</label>
              <label class="row"><input type="radio" name="q{{i}}" [(ngModel)]="respuestas[i]" [value]="false"/> Falso</label>
            </div>
            <div *ngSwitchCase="'respuesta_corta'">
              <input type="text" class="short" [(ngModel)]="respuestas[i]" name="q{{i}}" placeholder="Tu respuesta"/>
            </div>
          </ng-container>
        </div>
      </form>
    </div>
  </div>
  `,
  styles: [`
    .card{max-width:900px;margin:2rem auto;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.06)}
    .card-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid rgba(0,0,0,.06)}
    .card-body{padding:1rem 1.25rem}
    .btn-outline{border:1px solid #cbd5e1;background:#fff;color:#1f2937;border-radius:10px;padding:.5rem .8rem;text-decoration:none}
    .q-item{border:1px solid #e5e7eb;border-radius:12px;padding:.8rem 1rem;margin:12px 0}
    .row{display:flex;gap:8px;align-items:center;margin:.3rem 0}
    .short{width:100%;border:1px solid #e5e7eb;border-radius:10px;padding:.5rem .7rem}
  `]
})
export class EvaluacionRendirComponent implements OnInit {
  quiz!: QuizResponse;
  respuestas: any[] = [];
  items: any[] = [];
  constructor(private api: QuizzesService, private route: ActivatedRoute, private router: Router) {}
  ngOnInit(){
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.obtenerPublico(id).subscribe(q=>{
      this.quiz = q;
      this.items = ((q as any)?.preguntas?.items) || [];
      this.respuestas = new Array(this.items.length).fill(null);
    });
  }
}
