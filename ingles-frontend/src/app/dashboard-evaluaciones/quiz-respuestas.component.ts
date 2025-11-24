import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { QuizzesService, QuizRespuestaResponse, QuizResponse } from '../services/quizzes.service';

@Component({
  selector: 'app-quiz-respuestas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <div class="dashboard-container">
    <div class="dashboard-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="dashboard-title">🧪 Respuestas de Evaluación</h1>
          <p class="dashboard-subtitle">Revisa las respuestas entregadas por los estudiantes</p>
        </div>
        <button class="btn-secondary" (click)="volver()">
          <span class="btn-icon">←</span>
          Volver
        </button>
      </div>
    </div>

    <div class="quiz-info-card" *ngIf="quiz">
      <div class="quiz-main">
        <h2 class="quiz-title">{{ quiz.titulo }}</h2>
        <p class="quiz-meta">Unidad {{ quiz.unidad_id }} · ID #{{ quiz.id }}</p>
      </div>
    </div>

    <div class="content-layout">
      <div class="responses-list-card">
        <div class="card-header">
          <h3 class="card-title">👥 Respuestas Entregadas</h3>
          <span class="badge">{{ respuestas.length }} entregas</span>
        </div>

        <div class="search-bar">
          <input
            type="text"
            class="search-input"
            [(ngModel)]="filtro"
            placeholder="Buscar por nombre de usuario"
          />
        </div>

        <div *ngIf="respuestasFiltradas.length === 0" class="empty-state">
          <div class="empty-icon">📭</div>
          <p class="empty-text">Aún no hay respuestas registradas para esta evaluación.</p>
        </div>

        <div class="responses-list" *ngIf="respuestasFiltradas.length > 0">
          <button
            class="response-item"
            *ngFor="let r of respuestasFiltradas"
            (click)="seleccionar(r)"
            [class.active]="respuestaSeleccionada && respuestaSeleccionada.id === r.id"
          >
            <div class="response-main">
              <div class="avatar">{{ (r.estudiante_username || '?')[0] | uppercase }}</div>
              <div class="info">
                <div class="username">@{{ r.estudiante_username }}</div>
                <div class="date">{{ r.created_at | date:'dd/MM/yyyy HH:mm' }}</div>
              </div>
            </div>
            <div class="score-pill">
              {{ r.score }}/100
            </div>
          </button>
        </div>
      </div>

      <div class="response-detail-card" *ngIf="respuestaSeleccionada">
        <div class="card-header">
          <h3 class="card-title">📄 Detalle de Respuesta</h3>
          <div class="detail-meta">
            <span class="meta-pill">@{{ respuestaSeleccionada.estudiante_username }}</span>
            <span class="meta-pill">{{ respuestaSeleccionada.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
            <span class="meta-pill score">{{ respuestaSeleccionada.score }}/100</span>
          </div>
        </div>

        <div *ngIf="detallePreguntas.length; else sinDetalle" class="questions-detail">
          <div class="question-row" *ngFor="let d of detallePreguntas; let i = index">
            <div class="question-index">#{{ i + 1 }}</div>
            <div class="question-body">
              <div class="question-text">{{ d.enunciado }}</div>
              <div class="answer-pill">
                <span class="answer-label">Respuesta del estudiante:</span>
                <span class="answer-text">{{ d.respuesta }}</span>
              </div>
            </div>
          </div>
        </div>

        <ng-template #sinDetalle>
          <div class="placeholder">
            <p>No se encontraron respuestas asociadas a las preguntas de este quiz.</p>
          </div>
        </ng-template>
      </div>

      <div class="response-detail-card" *ngIf="!respuestaSeleccionada && respuestasFiltradas.length > 0">
        <div class="card-header">
          <h3 class="card-title">📄 Detalle de Respuesta</h3>
        </div>
        <div class="placeholder">
          <p>Selecciona un estudiante en la lista para ver sus respuestas.</p>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    :host {
      --primary-color: #4f46e5;
      --primary-soft: #eef2ff;
      --success-color: #16a34a;
      --surface-color: #ffffff;
      --bg-color: #f3f4f6;
    }

    .dashboard-container {
      min-height: 100vh;
      background: radial-gradient(circle at top left, #e0f2fe 0, #f3f4f6 45%, #e5e7eb 100%);
      padding: 5rem 2.5rem 2rem;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .dashboard-header { margin-bottom: 1.75rem; }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255, 255, 255, 0.96);
      border-radius: 24px;
      padding: 1.5rem 2.25rem;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.09);
      border: 1px solid rgba(148, 163, 184, 0.15);
    }

    .dashboard-title {
      margin: 0 0 0.35rem;
      font-size: 1.8rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      color: #0f172a;
    }

    .dashboard-subtitle {
      margin: 0;
      color: #6b7280;
      font-size: 0.95rem;
    }

    .btn-secondary {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 999px;
      padding: 0.55rem 1.3rem;
      display: flex;
      align-items: center;
      gap: 0.45rem;
      cursor: pointer;
      font-weight: 600;
      color: #111827;
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.05);
      transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
    }

    .btn-secondary:hover {
      background: #f9fafb;
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.12);
      transform: translateY(-1px);
    }

    .btn-icon { font-size: 1.1rem; }

    .quiz-info-card {
      background: #ffffff;
      border-radius: 18px;
      padding: 1rem 1.75rem;
      margin-bottom: 1.6rem;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-left: 4px solid var(--primary-color);
    }

    .quiz-title {
      margin: 0;
      font-size: 1.35rem;
      font-weight: 600;
      color: #0f172a;
    }

    .quiz-meta {
      margin: 0.25rem 0 0;
      color: #6b7280;
      font-size: 0.9rem;
    }

    .content-layout {
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(0, 1.45fr);
      gap: 1.5rem;
      align-items: flex-start;
    }

    .responses-list-card,
    .response-detail-card {
      background: #ffffff;
      border-radius: 20px;
      padding: 1.25rem 1.5rem;
      box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
      border: 1px solid rgba(148, 163, 184, 0.18);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .card-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #111827;
    }

    .badge {
      background: var(--primary-soft);
      color: var(--primary-color);
      border-radius: 999px;
      padding: 0.25rem 0.9rem;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .search-bar { margin-bottom: 0.9rem; }

    .search-input {
      width: 100%;
      border-radius: 999px;
      border: 1px solid #e5e7eb;
      padding: 0.55rem 1rem;
      font-size: 0.9rem;
      background: #f9fafb;
      transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18);
      background: #ffffff;
    }

    .responses-list {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      max-height: 420px;
      overflow-y: auto;
    }

    .response-item {
      border: none;
      padding: 0.65rem 0.8rem;
      border-radius: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f9fafb;
      cursor: pointer;
      transition: background 0.15s, transform 0.1s, box-shadow 0.1s, border-color 0.15s;
      border: 1px solid transparent;
    }

    .response-item:hover {
      background: #eef2ff;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
      transform: translateY(-1px);
    }

    .response-item.active {
      background: #e0e7ff;
      box-shadow: 0 8px 22px rgba(79, 70, 229, 0.45);
      border-color: var(--primary-color);
    }

    .response-main {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .avatar {
      width: 34px;
      height: 34px;
      border-radius: 999px;
      background: linear-gradient(135deg, #4f46e5, #6366f1);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .username {
      font-weight: 600;
      font-size: 0.9rem;
      color: #111827;
    }

    .date {
      font-size: 0.78rem;
      color: #6b7280;
    }

    .score-pill {
      padding: 0.28rem 0.75rem;
      border-radius: 999px;
      background: #ecfdf5;
      color: #166534;
      font-weight: 600;
      font-size: 0.78rem;
    }

    .empty-state {
      padding: 1.4rem 0.75rem;
      text-align: center;
      color: #6b7280;
    }

    .empty-icon { font-size: 2rem; margin-bottom: 0.4rem; }

    .json-viewer {
      background: #020617;
      color: #e5e7eb;
      border-radius: 14px;
      padding: 1rem 1.1rem;
      max-height: 440px;
      overflow: auto;
      font-size: 0.82rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
      line-height: 1.5;
      border: 1px solid rgba(15, 23, 42, 0.6);
    }

    .questions-detail {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-height: 440px;
      overflow-y: auto;
    }

    .question-row {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 0.75rem;
      padding: 0.75rem 0.85rem;
      border-radius: 12px;
      background: #f9fafb;
      border: 1px solid rgba(226, 232, 240, 0.8);
    }

    .question-index {
      align-self: flex-start;
      font-weight: 700;
      font-size: 0.85rem;
      color: #4f46e5;
      background: #e0e7ff;
      border-radius: 999px;
      padding: 0.3rem 0.65rem;
    }

    .question-body {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .question-text {
      font-weight: 600;
      font-size: 0.9rem;
      color: #111827;
    }

    .answer-pill {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem 0.5rem;
      padding: 0.4rem 0.65rem;
      border-radius: 999px;
      background: #ecfeff;
      border: 1px solid #06b6d4;
    }

    .answer-label {
      font-size: 0.8rem;
      color: #0f172a;
      opacity: 0.8;
    }

    .answer-text {
      font-size: 0.85rem;
      font-weight: 600;
      color: #0f172a;
    }

    .detail-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      justify-content: flex-end;
    }

    .meta-pill {
      padding: 0.25rem 0.7rem;
      border-radius: 999px;
      background: #f3f4f6;
      font-size: 0.8rem;
      color: #111827;
    }

    .meta-pill.score {
      background: #ecfdf5;
      color: #166534;
    }

    .placeholder {
      padding: 1.4rem 0.75rem;
      color: #6b7280;
      text-align: center;
    }

    @media (max-width: 960px) {
      .dashboard-container { padding: 5rem 1rem 1rem; }
      .content-layout { grid-template-columns: 1fr; }
    }
  `]
})
export class QuizRespuestasComponent implements OnInit {
  quiz: QuizResponse | null = null;
  respuestas: QuizRespuestaResponse[] = [];
  respuestaSeleccionada: QuizRespuestaResponse | null = null;
  filtro = '';
  detallePreguntas: { enunciado: string; respuesta: string }[] = [];
  itemsPreguntas: any[] = [];

  constructor(private api: QuizzesService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { return; }

    this.api.obtener(id).subscribe({
      next: q => {
        this.quiz = q;
        const raw: any = (q as any).preguntas;
        let items: any[] = [];
        if (raw?.preguntas) {
          items = raw.preguntas;
        } else if (Array.isArray(raw)) {
          items = raw;
        } else if (raw?.items) {
          items = raw.items;
        }
        this.itemsPreguntas = Array.isArray(items) ? items : [];
        this.actualizarDetalle();
      },
      error: () => {
        this.quiz = null;
        this.itemsPreguntas = [];
        this.detallePreguntas = [];
      }
    });

    this.api.listarRespuestas(id).subscribe({
      next: rs => {
        this.respuestas = rs || [];
        this.respuestaSeleccionada = this.respuestas[0] || null;
        this.actualizarDetalle();
      },
      error: () => {
        this.respuestas = [];
        this.respuestaSeleccionada = null;
        this.detallePreguntas = [];
      }
    });
  }

  get respuestasFiltradas(): QuizRespuestaResponse[] {
    const term = (this.filtro || '').trim().toLowerCase();
    if (!term) return this.respuestas;
    return this.respuestas.filter(r => (r.estudiante_username || '').toLowerCase().includes(term));
  }

  seleccionar(r: QuizRespuestaResponse): void {
    this.respuestaSeleccionada = r;
    this.actualizarDetalle();
  }

  volver(): void {
    const url = this.router.url || '';
    if (url.startsWith('/dashboard-profesor')) {
      this.router.navigateByUrl('/dashboard-profesor/quizzes');
    } else if (url.startsWith('/dashboard-empresa')) {
      this.router.navigateByUrl('/dashboard-empresa/quizzes');
    } else {
      this.router.navigateByUrl('/');
    }
  }

  private actualizarDetalle(): void {
    if (!this.quiz || !this.respuestaSeleccionada) {
      this.detallePreguntas = [];
      return;
    }

    const preguntas = this.itemsPreguntas || [];
    const resObj: any = this.respuestaSeleccionada.respuestas || {};

    this.detallePreguntas = preguntas.map((p: any, index: number) => {
      const key = `pregunta_${index}`;
      const valor = resObj[key];
      let textoRespuesta = '';

      if (p?.tipo === 'opcion_multiple') {
        if (valor === null || valor === undefined || valor === '') {
          textoRespuesta = '(sin respuesta)';
        } else if (Array.isArray(p.opciones) && p.opciones[valor]) {
          textoRespuesta = p.opciones[valor].texto || `(opción #${Number(valor) + 1})`;
        } else {
          textoRespuesta = `(opción ${valor})`;
        }
      } else if (p?.tipo === 'vf') {
        if (valor === true) textoRespuesta = 'Verdadero';
        else if (valor === false) textoRespuesta = 'Falso';
        else textoRespuesta = '(sin respuesta)';
      } else {
        if (valor === null || valor === undefined || valor === '') {
          textoRespuesta = '(sin respuesta)';
        } else {
          textoRespuesta = String(valor);
        }
      }

      return {
        enunciado: p?.enunciado ?? '(Pregunta sin texto)',
        respuesta: textoRespuesta
      };
    });
  }
}
