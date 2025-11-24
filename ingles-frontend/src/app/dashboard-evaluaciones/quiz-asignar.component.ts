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
  <div class="container">
    <!-- Header con gradiente -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <div class="icon-wrapper">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12l2 2 4-4"/>
              <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
              <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
              <path d="M3 12h6m6 0h6"/>
            </svg>
          </div>
          <div class="header-text">
            <h1>Asignar Evaluación</h1>
            <p>Configura las asignaciones de evaluación por unidad</p>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" (click)="volver()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Volver
          </button>
        </div>
      </div>
    </div>

    <!-- Formulario principal -->
    <div class="main-content">
      <div class="form-card">
        <div class="form-header">
          <h3>Nueva Asignación</h3>
          <div class="form-subtitle">Asigna esta evaluación a una unidad específica</div>
        </div>
        
        <form (ngSubmit)="guardar()" #frm="ngForm" class="assignment-form">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">
                <span class="label-text">Unidad</span>
                <span class="label-required">*</span>
              </label>
              <div class="input-wrapper">
                <input 
                  type="number" 
                  required 
                  [(ngModel)]="form.unidad_id" 
                  name="unidad_id" 
                  (ngModelChange)="onUnidadChange()"
                  class="form-input"
                  placeholder="Selecciona una unidad"
                />
                <div class="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
              </div>
              <div class="form-help" *ngIf="form.unidad_id">
                <div class="students-count">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span>{{ estudiantesHabilitados ?? 'Cargando...' }} estudiantes habilitados</span>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">
                <span class="label-text">Tiempo límite (minutos)</span>
                <span class="label-optional">0 = Sin límite</span>
              </label>
              <div class="input-wrapper">
                <input
                  type="number"
                  min="0"
                  step="1"
                  [(ngModel)]="form.tiempo_limite_minutos"
                  name="tiempo_limite_minutos"
                  class="form-input"
                  placeholder="Ej: 20"
                />
                <div class="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12,6 12,12 16,14"/>
                  </svg>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">
                <span class="label-text">Fecha de inicio</span>
                <span class="label-optional">Opcional</span>
              </label>
              <div class="input-wrapper">
                <input 
                  type="datetime-local" 
                  [(ngModel)]="start" 
                  name="start"
                  class="form-input"
                />
                <div class="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">
                <span class="label-text">Fecha de fin</span>
                <span class="label-optional">Opcional</span>
              </label>
              <div class="input-wrapper">
                <input 
                  type="datetime-local" 
                  [(ngModel)]="end" 
                  name="end"
                  class="form-input"
                />
                <div class="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">
                <span class="label-text">Número máximo de intentos</span>
                <span class="label-optional">0 = Ilimitados</span>
              </label>
              <div class="input-wrapper">
                <input
                  type="number"
                  min="0"
                  step="1"
                  [(ngModel)]="form.max_intentos"
                  name="max_intentos"
                  class="form-input"
                  placeholder="Ej: 3"
                />
                <div class="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v4l3 3"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary" [disabled]="!form.unidad_id">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4"/>
              </svg>
              Crear Asignación
            </button>
          </div>
        </form>
      </div>

      <!-- Lista de asignaciones existentes -->
      <div class="assignments-card" *ngIf="asignaciones.length > 0">
        <div class="assignments-header">
          <h3>Asignaciones Activas</h3>
          <div class="assignments-count">{{ asignaciones.length }} asignación(es)</div>
        </div>
        
        <div class="assignments-list">
          <div class="assignment-item" *ngFor="let a of asignaciones; trackBy: trackByAssignment">
            <div class="assignment-info">
              <div class="assignment-unit">
                <div class="unit-badge">Unidad {{ a.unidad_id }}</div>
              </div>
              <div class="assignment-dates">
                <div class="date-range">
                  <div class="date-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12,6 12,12 16,14"/>
                    </svg>
                    <span>Inicio: {{ formatDate(a.start_at) || 'Sin límite' }}</span>
                  </div>
                  <div class="date-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12,6 12,12 16,14"/>
                    </svg>
                    <span>Fin: {{ formatDate(a.end_at) || 'Sin límite' }}</span>
                  </div>
                </div>
                <div class="attempts-info">
                  <span *ngIf="a.max_intentos && a.max_intentos > 0">Intentos máximos: {{ a.max_intentos }}</span>
                  <span *ngIf="!a.max_intentos || a.max_intentos === 0">Intentos: Ilimitados</span>
                  <span class="time-info" *ngIf="a.tiempo_limite_minutos && a.tiempo_limite_minutos > 0">
                    · Tiempo límite: {{ a.tiempo_limite_minutos }} min
                  </span>
                  <span class="time-info" *ngIf="!a.tiempo_limite_minutos || a.tiempo_limite_minutos === 0">
                    · Sin límite de tiempo
                  </span>
                </div>
              </div>
            </div>
            <div class="assignment-actions">
              <button class="btn-danger" (click)="del(a)" title="Eliminar asignación">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3,6 5,6 21,6"/>
                  <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Estado vacío -->
      <div class="empty-state" *ngIf="asignaciones.length === 0">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 12l2 2 4-4"/>
            <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
            <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
            <path d="M3 12h6m6 0h6"/>
          </svg>
        </div>
        <h3>No hay asignaciones</h3>
        <p>Esta evaluación aún no ha sido asignada a ninguna unidad. Crea tu primera asignación usando el formulario de arriba.</p>
      </div>
    </div>
  </div>
  `,
  styles: [`
    /* Container principal */
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
    }

    /* Header con gradiente */
    .page-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem 0;
      margin: 3rem -1rem 2rem -1rem;
      border-radius: 0 0 24px 24px;
    }

    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .icon-wrapper {
      width: 48px;
      height: 48px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px);
    }

    .header-text h1 {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.025em;
    }

    .header-text p {
      margin: 0.25rem 0 0 0;
      opacity: 0.9;
      font-size: 0.95rem;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    /* Botones */
    .btn-secondary {
      background: rgba(255, 255, 255, 0.15);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 10px;
      padding: 0.75rem 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
      transition: all 0.2s ease;
      backdrop-filter: blur(10px);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.25);
      transform: translateY(-1px);
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 10px;
      padding: 0.75rem 1.5rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.5);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .btn-danger {
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 0.5rem;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-danger:hover {
      background: #dc2626;
      transform: scale(1.05);
    }

    /* Contenido principal */
    .main-content {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    /* Tarjeta de formulario */
    .form-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border: 1px solid rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }

    .form-header {
      padding: 1.5rem 2rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    }

    .form-header h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #1e293b;
    }

    .form-subtitle {
      margin: 0.5rem 0 0 0;
      color: #64748b;
      font-size: 0.9rem;
    }

    /* Formulario */
    .assignment-form {
      padding: 2rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #374151;
    }

    .label-text {
      font-size: 0.9rem;
    }

    .label-required {
      color: #ef4444;
      font-size: 0.8rem;
    }

    .label-optional {
      color: #9ca3af;
      font-size: 0.8rem;
      font-weight: 400;
    }

    .input-wrapper {
      position: relative;
    }

    .form-input {
      width: 100%;
      padding: 0.75rem 1rem;
      padding-right: 2.5rem;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      font-size: 0.95rem;
      transition: all 0.2s ease;
      background: white;
    }

    .form-input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .input-icon {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: #9ca3af;
      pointer-events: none;
    }

    .form-help {
      margin-top: 0.5rem;
    }

    .students-count {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #059669;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
    }

    /* Tarjeta de asignaciones */
    .assignments-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border: 1px solid rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }

    .assignments-header {
      padding: 1.5rem 2rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .assignments-header h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #1e293b;
    }

    .assignments-count {
      background: #667eea;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .assignments-list {
      padding: 1rem;
    }

    .assignment-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      margin-bottom: 0.75rem;
      background: #fafafa;
      transition: all 0.2s ease;
    }

    .assignment-item:hover {
      border-color: #667eea;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
    }

    .assignment-item:last-child {
      margin-bottom: 0;
    }

    .assignment-info {
      flex: 1;
    }

    .assignment-unit {
      margin-bottom: 0.5rem;
    }

    .unit-badge {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 500;
      display: inline-block;
    }

    .assignment-dates {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .attempts-info {
      margin-top: 0.35rem;
      font-size: 0.8rem;
      color: #4b5563;
      font-weight: 500;
    }

    .time-info {
      display: inline-block;
      margin-left: 0.25rem;
      color: #6b7280;
    }

    .date-range {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .date-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #6b7280;
      font-size: 0.85rem;
    }

    .assignment-actions {
      display: flex;
      gap: 0.5rem;
    }

    /* Estado vacío */
    .empty-state {
      text-align: center;
      padding: 3rem 2rem;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border: 1px solid rgba(0, 0, 0, 0.05);
    }

    .empty-icon {
      margin: 0 auto 1.5rem auto;
      width: 64px;
      height: 64px;
      background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9ca3af;
    }

    .empty-state h3 {
      margin: 0 0 0.5rem 0;
      color: #374151;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .empty-state p {
      margin: 0;
      color: #6b7280;
      font-size: 0.95rem;
      line-height: 1.5;
      max-width: 400px;
      margin: 0 auto;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .container {
        padding: 0 0.5rem;
      }

      .header-content {
        padding: 0 1rem;
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .assignment-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }

      .assignment-actions {
        align-self: flex-end;
      }
    }
  `]
})
export class QuizAsignarComponent implements OnInit {
  quizId!: number;
  form: QuizAsignacionCreate = { unidad_id: 0 };
  start: string | null = null;
  end: string | null = null;
  asignaciones: QuizAsignacionResponse[] = [];
  estudiantesHabilitados: number | null = null;
  constructor(private api: QuizzesService, private route: ActivatedRoute, private router: Router) {}
  ngOnInit(){
    this.quizId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }
  load(){ this.api.listarAsignaciones(this.quizId).subscribe(r=> this.asignaciones = r); }
  onUnidadChange(){
    if (!this.form.unidad_id) { this.estudiantesHabilitados = null; return; }
    this.api.getEstudiantesHabilitadosCount(this.form.unidad_id).subscribe({
      next: r => this.estudiantesHabilitados = r.estudiantes_habilitados,
      error: _ => this.estudiantesHabilitados = null
    });
  }
  guardar(){
    const payload: QuizAsignacionCreate = {
      unidad_id: this.form.unidad_id,
      max_intentos: this.form.max_intentos ?? null,
      tiempo_limite_minutos: this.form.tiempo_limite_minutos ?? null
    };
    if (this.start) payload.start_at = new Date(this.start).toISOString();
    if (this.end) payload.end_at = new Date(this.end).toISOString();
    this.api.crearAsignacion(this.quizId, payload).subscribe(()=>{ this.load(); });
  }
  del(a: QuizAsignacionResponse){
    if(confirm('¿Estás seguro de que deseas eliminar esta asignación?'))
      this.api.eliminarAsignacion(this.quizId, a.id).subscribe(()=> this.load());
  }
  
  volver(){ 
    this.router.navigate([this._listUrl()]); 
  }
  
  formatDate(dateString: string | null | undefined): string | null {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }
  
  trackByAssignment(index: number, item: QuizAsignacionResponse): number {
    return item.id;
  }
  
  private _listUrl(): string {
    const seg = this.router.url.split('/')[1] || 'dashboard-profesor';
    return `/${seg}/quizzes`;
  }
}
