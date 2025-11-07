import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { QuizzesService, QuizAsignacionCreate, QuizAsignacionResponse } from '../services/quizzes.service';

@Component({
  selector: 'app-quiz-asignar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <div class="card">
    <div class="card-header">
      <h2>Asignar evaluación</h2>
      <div class="header-actions">
        <button class="btn-outline" (click)="volver()">Volver</button>
        <button class="btn" (click)="guardar()">Asignar</button>
      </div>
    </div>
    <div class="card-body">
      <form (ngSubmit)="guardar()" #frm="ngForm">
        <div class="grid">
          <label>Unidad ID
            <input type="number" required [(ngModel)]="form.unidad_id" name="unidad_id" />
          </label>
          <label>Inicio (opcional)
            <input type="datetime-local" [(ngModel)]="start" name="start" />
          </label>
          <label>Fin (opcional)
            <input type="datetime-local" [(ngModel)]="end" name="end" />
          </label>
        </div>
        <div class="actions">
          <button class="btn" type="submit">Asignar</button>
          <button class="btn-outline" type="button" (click)="volver()">Cancelar</button>
        </div>
      </form>
      <h3>Asignaciones</h3>
      <ul>
        <li *ngFor="let a of asignaciones">
          Unidad {{a.unidad_id}} • {{ a.start_at || '—' }} → {{ a.end_at || '—' }}
          <button class="link" (click)="del(a)">Eliminar</button>
        </li>
      </ul>
    </div>
  </div>
  <button class="fab-assign" (click)="guardar()" title="Asignar">↗</button>
  `,
  styles: [`
    .card{max-width:900px;margin:2rem auto;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.06)}
    .card-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid rgba(0,0,0,.06)}
    .header-actions{display:flex;gap:8px;align-items:center}
    .btn{background:linear-gradient(135deg,var(--primary,#667eea),var(--secondary,#764ba2));color:#fff;border:none;border-radius:10px;padding:.6rem .9rem;cursor:pointer;text-decoration:none}
    .card-body{padding:1rem 1.25rem}
    .grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:1rem}
    .link{background:transparent;border:none;color:var(--primary);cursor:pointer;margin-left:.5rem}
    .actions{display:flex;gap:8px}
    .btn-outline{border:1px solid #cbd5e1;background:#fff;color:#1f2937;border-radius:10px;padding:.6rem .9rem;cursor:pointer}
    .fab-assign{position:fixed;right:28px;bottom:28px;width:56px;height:56px;border-radius:14px;background:#2563eb;color:#fff;border:none;box-shadow:0 10px 25px rgba(0,0,0,.2);font-size:22px;display:flex;align-items:center;justify-content:center;font-weight:700;z-index:1150}
  `]
})
export class QuizAsignarComponent implements OnInit {
  quizId!: number;
  form: QuizAsignacionCreate = { unidad_id: 0 };
  start: string | null = null;
  end: string | null = null;
  asignaciones: QuizAsignacionResponse[] = [];
  constructor(private api: QuizzesService, private route: ActivatedRoute, private router: Router) {}
  ngOnInit(){
    this.quizId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }
  load(){ this.api.listarAsignaciones(this.quizId).subscribe(r=> this.asignaciones = r); }
  guardar(){
    const payload: QuizAsignacionCreate = { unidad_id: this.form.unidad_id };
    if (this.start) payload.start_at = new Date(this.start).toISOString();
    if (this.end) payload.end_at = new Date(this.end).toISOString();
    this.api.crearAsignacion(this.quizId, payload).subscribe(()=>{ this.load(); });
  }
  del(a: QuizAsignacionResponse){
    if(confirm('Eliminar asignación?'))
      this.api.eliminarAsignacion(this.quizId, a.id).subscribe(()=> this.load());
  }
  volver(){ this.router.navigate(['../'], { relativeTo: this.route }); }
}
