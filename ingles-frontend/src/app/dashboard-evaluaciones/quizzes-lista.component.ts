import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuizzesService, QuizResponse } from '../services/quizzes.service';

@Component({
  selector: 'app-quizzes-lista',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
  <div class="card">
    <div class="card-header">
      <h2>Evaluaciones</h2>
      <a class="btn" [routerLink]="['nuevo']">Nueva evaluación</a>
    </div>
    <div class="card-body">
      <div class="filters">
        <label>Unidad ID
          <input type="number" [(ngModel)]="fUnidad" (ngModelChange)="load()" placeholder="Ej: 1" />
        </label>
      </div>
      <table class="tabla">
        <thead>
          <tr>
            <th>ID</th>
            <th>Título</th>
            <th>Unidad</th>
            <th>Creado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let q of data">
            <td>{{ q.id }}</td>
            <td>{{ q.titulo }}</td>
            <td>{{ q.unidad_id }}</td>
            <td>{{ q.created_at | date:'short' }}</td>
            <td class="actions">
              <a [routerLink]="[q.id, 'editar']">Editar</a>
              <a [routerLink]="[q.id, 'asignar']">Asignar</a>
              <a [routerLink]="[q.id, 'permisos']" class="permisos">🔐 Permisos</a>
              <button (click)="del(q)">Eliminar</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div *ngIf="!data.length" class="empty">Sin evaluaciones</div>
    </div>
  </div>
  `,
  styles: [`
    .card{max-width:1100px;margin:2rem auto;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.06)}
    .card-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid rgba(0,0,0,.06)}
    .btn{background:linear-gradient(135deg,var(--primary, #667eea),var(--secondary, #764ba2));color:#fff;border:1px solid rgba(102,126,234,.4);border-radius:10px;padding:.6rem .9rem;cursor:pointer;text-decoration:none;display:inline-block}
    .card-body{padding:1rem 1.25rem}
    .filters{margin-bottom:1rem;display:flex;gap:12px;align-items:center}
    .tabla{width:100%;border-collapse:separate;border-spacing:0}
    th,td{padding:.6rem .7rem;border-bottom:1px dashed rgba(0,0,0,.08)}
    thead th{background:#f3f4f6;text-transform:uppercase;font-size:.8rem}
    .actions{white-space:nowrap}
    .actions a{margin-right:.5rem}
    .empty{padding:1rem;color:#6b7280}
  `]
})
export class QuizzesListaComponent implements OnInit {
  data: QuizResponse[] = [];
  fUnidad: number | null = null;
  constructor(private api: QuizzesService) {}
  ngOnInit(){ this.load(); }
  load(){ this.api.listar(this.fUnidad ?? undefined).subscribe(r=> this.data = r); }
  del(q: QuizResponse){ if(confirm('Eliminar evaluación?')){ this.api.eliminar(q.id).subscribe(()=> this.load()); } }
}
