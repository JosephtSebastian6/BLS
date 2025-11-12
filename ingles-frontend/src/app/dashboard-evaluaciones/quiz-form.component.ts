import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { QuizzesService, QuizCreate, QuizResponse } from '../services/quizzes.service';

@Component({
  selector: 'app-quiz-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <div class="card">
    <div class="card-header">
      <h2>{{ id ? 'Editar evaluación' : 'Nueva evaluación' }}</h2>
      <div class="header-actions">
        <button class="btn-outline-secondary" type="button" (click)="volver()">Volver</button>
        <button class="btn" type="button" (click)="guardar()">{{ id ? 'Guardar' : 'Crear' }}</button>
      </div>
    </div>
    <div class="card-body">
      <form (ngSubmit)="guardar()" #frm="ngForm">
        <div class="grid">
          <label>
            Unidad ID
            <input type="number" required [(ngModel)]="form.unidad_id" name="unidad_id" />
          </label>
          <label>
            Título
            <input type="text" required [(ngModel)]="form.titulo" name="titulo" />
          </label>
        </div>
        <label>
          Descripción
          <textarea rows="3" [(ngModel)]="form.descripcion" name="descripcion"></textarea>
        </label>
        <div class="top-actions">
          <button class="btn primary hard" type="button" (click)="guardar()">{{ id ? 'Guardar cambios' : 'Crear evaluación' }}</button>
          <button class="btn-outline-secondary" type="button" (click)="volver()">Cancelar</button>
        </div>
        <div class="q-editor">
          <div class="q-editor-header">
            <h3>Preguntas</h3>
            <div class="actions-row">
              <select [(ngModel)]="nuevoTipo" name="nuevoTipo" (keyup.enter)="onAgregarClick($event)">
                <option value="opcion_multiple">Opción múltiple</option>
                <option value="vf">Verdadero/Falso</option>
                <option value="respuesta_corta">Respuesta corta</option>
              </select>
              <button type="button" class="btn add-btn" (click)="onAgregarClick($event)">Agregar pregunta</button>
              <button type="button" class="btn-outline-secondary" (click)="onAgregarClick($event)">Agregar</button>
            </div>
          </div>
          <div *ngIf="!items.length" class="empty">
            Sin preguntas.
            <button type="button" class="btn-outline" (click)="onAgregarClick($event)">Agregar la primera</button>
          </div>
          <div class="q-item" *ngFor="let it of items; let i = index">
            <div class="q-item-head">
              <strong>#{{ i+1 }} • {{ etiquetaTipo(it.tipo) }}</strong>
              <div class="q-item-actions">
                <button type="button" class="link" (click)="mover(i,-1)" [disabled]="i===0">↑</button>
                <button type="button" class="link" (click)="mover(i,1)" [disabled]="i===items.length-1">↓</button>
                <button type="button" class="link danger" (click)="eliminarPregunta(i)">Eliminar</button>
              </div>
            </div>
            <label>
              Enunciado
              <input type="text" [(ngModel)]="it.enunciado" name="enunciado_{{i}}" required />
            </label>
            <div class="grid small">
              <label>
                Puntaje
                <input type="number" min="0" step="1" [(ngModel)]="it.puntaje" name="puntaje_{{i}}" />
              </label>
            </div>
            <ng-container [ngSwitch]="it.tipo">
              <div *ngSwitchCase="'opcion_multiple'" class="options">
                <div class="opt-row" *ngFor="let op of it.opciones; let j = index">
                  <input type="text" [(ngModel)]="op.texto" name="op_texto_{{i}}_{{j}}" placeholder="Opción" />
                  <label class="chk">
                    <input type="checkbox" [(ngModel)]="op.correcta" name="op_ok_{{i}}_{{j}}" /> Correcta
                  </label>
                  <button type="button" class="link" (click)="eliminarOpcion(i,j)">Quitar</button>
                </div>
                <button type="button" class="btn-outline" (click)="agregarOpcion(i)">Agregar opción</button>
              </div>
              <div *ngSwitchCase="'vf'" class="options">
                <label>
                  Respuesta correcta
                  <select [(ngModel)]="it.respuesta" name="vf_resp_{{i}}">
                    <option [ngValue]="true">Verdadero</option>
                    <option [ngValue]="false">Falso</option>
                  </select>
                </label>
              </div>
              <div *ngSwitchCase="'respuesta_corta'" class="options">
                <label>
                  Respuesta esperada (opcional)
                  <input type="text" [(ngModel)]="it.respuesta" name="rc_resp_{{i}}" placeholder="Texto de referencia" />
                </label>
              </div>
            </ng-container>
          </div>
        </div>
        <div class="actions center">
          <button class="btn lg" type="submit">{{ id ? 'Guardar cambios' : 'Crear evaluación' }}</button>
        </div>
      </form>
    </div>
  </div>
  <button type="button" class="fab" (click)="onAgregarClick($event)" title="Agregar pregunta">+</button>
  <button type="button" class="fab-save" (click)="guardar()" title="Guardar evaluación">✓</button>
  <div class="action-bar">
    <div class="bar-inner">
      <span>{{ id ? 'Editar evaluación' : 'Nueva evaluación' }}</span>
      <div class="bar-actions">
        <button class="btn-outline-secondary" type="button" (click)="volver()">Cancelar</button>
        <button class="btn" type="button" (click)="guardar()">{{ id ? 'Guardar cambios' : 'Crear evaluación' }}</button>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .card{max-width:900px;margin:2rem auto;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.06)}
    .card-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid rgba(0,0,0,.06)}
    .header-actions{display:flex;gap:8px;align-items:center}
    .btn{background:linear-gradient(135deg,var(--primary),var(--secondary)) !important;color:#fff !important;border:none;border-radius:10px;padding:.6rem .9rem;cursor:pointer;text-decoration:none;display:inline-block}
    .card-body{padding:1rem 1.25rem}
    form label{display:block;margin-bottom:.9rem}
    input,textarea{width:100%;border:1px solid #e5e7eb;border-radius:10px;padding:.6rem .7rem;background:#fff}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .top-actions{display:flex;gap:10px;justify-content:flex-end;margin:.5rem 0 1rem}
    .btn.primary{background:linear-gradient(135deg,var(--primary,#667eea),var(--secondary,#764ba2)) !important;border:2px solid rgba(102,126,234,.6) !important}
    .btn.hard{background:#2563eb !important;border-color:#1d4ed8 !important;color:#fff !important}
    .actions{margin-top:1rem}
    .actions.center{display:flex;justify-content:center;padding:1rem 0}
    .btn.lg{padding:.8rem 1.2rem;font-size:1rem;min-width:220px}
    .q-editor{margin-top:1rem;padding-top:.5rem;border-top:1px dashed #e5e7eb}
    .q-editor-header{display:flex;align-items:center;justify-content:space-between;margin:.5rem 0 1rem}
    .actions-row{display:flex;gap:8px;align-items:center}
    .q-item{border:1px solid #e5e7eb;border-radius:12px;padding:.8rem 1rem;margin-bottom:12px;background:#fafafa}
    .q-item-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem}
    .q-item-actions .link{margin-left:.5rem}
    .link{background:transparent;border:none;color:var(--primary);cursor:pointer}
    .link.danger{color:#dc2626}
    .btn-outline{border:2px solid var(--primary);background:transparent;color:var(--primary);padding:.45rem .7rem;border-radius:10px;cursor:pointer}
    .btn-outline-secondary{border:1px solid #cbd5e1;background:#fff;color:#1f2937;padding:.45rem .7rem;border-radius:10px;cursor:pointer}
    .add-btn{min-width:180px;text-align:center}
    .empty{display:flex;gap:8px;align-items:center;color:#6b7280;margin:.25rem 0 1rem}
    .options .opt-row{display:flex;gap:8px;align-items:center;margin-bottom:6px}
    .options .chk{display:inline-flex;gap:6px;align-items:center}
    .grid.small{grid-template-columns:200px 1fr}
    .fab{position:fixed;right:28px;bottom:28px;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--primary,#667eea),var(--secondary,#764ba2));color:#fff;border:none;box-shadow:0 10px 25px rgba(0,0,0,.2);font-size:28px;line-height:0;display:flex;align-items:center;justify-content:center;z-index:1150}
    .fab-save{position:fixed;right:28px;bottom:92px;width:56px;height:56px;border-radius:14px;background:#16a34a;color:#fff;border:none;box-shadow:0 10px 25px rgba(0,0,0,.2);font-size:22px;display:flex;align-items:center;justify-content:center;font-weight:700;z-index:1150}
    .action-bar{position:fixed;left:0;right:0;bottom:0;background:rgba(255,255,255,.95);backdrop-filter:blur(8px);border-top:1px solid #e5e7eb;box-shadow:0 -6px 20px rgba(0,0,0,.06);z-index:1100}
    .bar-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:.6rem 1rem;color:#6b7280}
    .bar-actions{display:flex;gap:8px;align-items:center}
  `]
})
export class QuizFormComponent implements OnInit {
  id: number | null = null;
  form: QuizCreate = { unidad_id: 0, titulo: '', descripcion: '', preguntas: null };
  // Editor visual
  nuevoTipo: 'opcion_multiple' | 'vf' | 'respuesta_corta' = 'opcion_multiple';
  items: any[] = [];
  constructor(private api: QuizzesService, private route: ActivatedRoute, private router: Router) {}
  ngOnInit(){
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.id = Number(idParam);
      this.api.obtener(this.id).subscribe((q: QuizResponse)=>{
        this.form = { unidad_id: q.unidad_id, titulo: q.titulo, descripcion: q.descripcion ?? '', preguntas: q.preguntas ?? null };
        const incoming = q.preguntas && (q.preguntas as any).items ? (q.preguntas as any).items : [];
        this.items = Array.isArray(incoming) ? incoming : [];
      });
    }
  }
  guardar(){
    // Serializar a estructura { items: [...] }
    this.form.preguntas = { items: this.items };
    const req = this.id ? this.api.actualizar(this.id, this.form) : this.api.crear(this.form);
    req.subscribe((r)=>{
      this.router.navigate([this._listUrl()]);
    });
  }
  volver(){ this.router.navigate([this._listUrl()]); }

  private _listUrl(): string {
    const seg = this.router.url.split('/')[1] || 'dashboard-profesor';
    return `/${seg}/quizzes`;
  }

  etiquetaTipo(t: string){
    return t === 'opcion_multiple' ? 'Opción múltiple' : t === 'vf' ? 'Verdadero/Falso' : 'Respuesta corta';
  }
  agregarPregunta(){
    if(this.nuevoTipo === 'opcion_multiple'){
      this.items.push({ tipo: 'opcion_multiple', enunciado: '', puntaje: 1, opciones: [ { texto: '', correcta: false }, { texto: '', correcta: false } ] });
    } else if(this.nuevoTipo === 'vf'){
      this.items.push({ tipo: 'vf', enunciado: '', puntaje: 1, respuesta: true });
    } else {
      this.items.push({ tipo: 'respuesta_corta', enunciado: '', puntaje: 1, respuesta: '' });
    }
    // Forzar CD en algunos entornos
    this.items = [...this.items];
  }
  eliminarPregunta(i: number){ this.items.splice(i,1); }
  mover(i: number, dir: number){
    const j = i + dir; if(j < 0 || j >= this.items.length) return; const tmp = this.items[i]; this.items[i] = this.items[j]; this.items[j] = tmp;
  }
  agregarOpcion(i: number){ this.items[i].opciones.push({ texto: '', correcta: false }); }
  eliminarOpcion(i: number, j: number){ this.items[i].opciones.splice(j,1); }

  onAgregarClick(ev: Event){ ev.preventDefault(); ev.stopPropagation(); this.agregarPregunta(); }
}
