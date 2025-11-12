import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuizzesService, QuizResponse } from '../services/quizzes.service';

@Component({
  selector: 'app-quizzes-lista',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
  <div class="dashboard-container">
    <!-- Header Section -->
    <div class="dashboard-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="dashboard-title">📊 Evaluaciones</h1>
          <p class="dashboard-subtitle">Gestiona y administra las evaluaciones de tu plataforma</p>
        </div>
        <button class="btn-primary" (click)="navigateToNew()">
          <span class="btn-icon">➕</span>
          Nueva Evaluación
        </button>
      </div>
    </div>

    <!-- Filters Section -->
    <div class="filters-card">
      <div class="filter-group">
        <label class="filter-label">
          <span class="label-text">🎯 Filtrar por Unidad</span>
          <div class="input-wrapper">
            <input 
              type="number" 
              [(ngModel)]="fUnidad" 
              (ngModelChange)="load()" 
              placeholder="Todas las unidades"
              class="filter-input"
            />
            <span class="input-icon">🔍</span>
          </div>
        </label>
        <div class="stats-info">
          <span class="stat-item">
            <span class="stat-number">{{ data.length }}</span>
            <span class="stat-label">Evaluaciones</span>
          </span>
        </div>
      </div>
    </div>

    <!-- Content Section -->
    <div class="content-grid" *ngIf="data.length > 0">
      <div class="evaluation-card" *ngFor="let q of data; trackBy: trackByQuiz">
        <div class="card-header">
          <div class="quiz-info">
            <h3 class="quiz-title">{{ q.titulo }}</h3>
            <div class="quiz-meta">
              <span class="meta-item">
                <span class="meta-icon">🎯</span>
                Unidad {{ q.unidad_id }}
              </span>
              <span class="meta-item">
                <span class="meta-icon">📅</span>
                {{ q.created_at | date:'dd/MM/yyyy' }}
              </span>
            </div>
          </div>
          <div class="quiz-id">
            <span class="id-badge">#{{ q.id }}</span>
          </div>
        </div>
        
        <div class="card-actions">
          <button class="action-btn edit-btn" (click)="editQuiz(q.id)">
            <span class="action-icon">✏️</span>
            Editar
          </button>
          <button class="action-btn assign-btn" (click)="assignQuiz(q.id)">
            <span class="action-icon">📋</span>
            Asignar
          </button>
          <button class="action-btn permissions-btn" (click)="managePermissions(q.id)">
            <span class="action-icon">🔐</span>
            Permisos
          </button>
          <button class="action-btn delete-btn" (click)="del(q)">
            <span class="action-icon">🗑️</span>
            Eliminar
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div class="empty-state" *ngIf="!data.length">
      <div class="empty-icon">📝</div>
      <h3 class="empty-title">No hay evaluaciones</h3>
      <p class="empty-description">
        Comienza creando tu primera evaluación para gestionar el aprendizaje de tus estudiantes
      </p>
      <button class="btn-primary" (click)="navigateToNew()">
        <span class="btn-icon">➕</span>
        Crear Primera Evaluación
      </button>
    </div>
  </div>
  `,
  styles: [`
    /* Variables CSS del sistema */
    :host {
      --primary-color: #667eea;
      --secondary-color: #764ba2;
      --text-primary: #1f2937;
      --text-secondary: #6b7280;
      --background-neutral: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%);
      --card-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      --border-radius: 20px;
      --transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .dashboard-container {
      min-height: 100vh;
      background: #f8f9fa;
      padding: 5rem 2rem 2rem 2rem;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* Header Section */
    .dashboard-header {
      margin-bottom: 2rem;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      padding: 2rem;
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .title-section {
      flex: 1;
    }

    .dashboard-title {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 0.5rem 0;
      text-transform: uppercase;
      letter-spacing: -0.02em;
    }

    .dashboard-subtitle {
      font-size: 1.1rem;
      color: var(--text-secondary);
      margin: 0;
      font-weight: 400;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
      border: none;
      border-radius: 15px;
      padding: 1rem 2rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
    }

    .btn-icon {
      font-size: 1.2rem;
    }

    /* Filters Section */
    .filters-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      padding: 1.5rem 2rem;
      margin-bottom: 2rem;
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .filter-group {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 2rem;
    }

    .filter-label {
      flex: 1;
      max-width: 400px;
    }

    .label-text {
      display: block;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 0.9rem;
    }

    .input-wrapper {
      position: relative;
    }

    .filter-input {
      width: 100%;
      padding: 1rem 3rem 1rem 1rem;
      border: 2px solid rgba(102, 126, 234, 0.1);
      border-radius: 12px;
      font-size: 1rem;
      background: white;
      transition: var(--transition);
    }

    .filter-input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .input-icon {
      position: absolute;
      right: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-secondary);
      font-size: 1.2rem;
    }

    .stats-info {
      display: flex;
      gap: 1rem;
    }

    .stat-item {
      text-align: center;
      padding: 1rem;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      border-radius: 12px;
      color: white;
      min-width: 100px;
    }

    .stat-number {
      display: block;
      font-size: 1.8rem;
      font-weight: 700;
    }

    .stat-label {
      display: block;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.9;
    }

    /* Content Grid */
    .content-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 1.5rem;
    }

    .evaluation-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      padding: 1.5rem;
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: var(--transition);
    }

    .evaluation-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
    }

    .quiz-info {
      flex: 1;
    }

    .quiz-title {
      font-size: 1.3rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 0.5rem 0;
      line-height: 1.3;
    }

    .quiz-meta {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .meta-icon {
      font-size: 1rem;
    }

    .quiz-id {
      margin-left: 1rem;
    }

    .id-badge {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Action Buttons */
    .card-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.8rem;
    }

    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.8rem 1rem;
      border: none;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .edit-btn {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
    }

    .assign-btn {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: white;
    }

    .permissions-btn {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: white;
    }

    .delete-btn {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
    }

    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }

    .action-icon {
      font-size: 1rem;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-title {
      font-size: 1.8rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 1rem 0;
    }

    .empty-description {
      font-size: 1.1rem;
      color: var(--text-secondary);
      margin: 0 0 2rem 0;
      max-width: 500px;
      margin-left: auto;
      margin-right: auto;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .dashboard-container {
        padding: 1rem;
      }

      .header-content {
        flex-direction: column;
        gap: 1.5rem;
        text-align: center;
      }

      .filter-group {
        flex-direction: column;
        align-items: stretch;
      }

      .content-grid {
        grid-template-columns: 1fr;
      }

      .card-actions {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class QuizzesListaComponent implements OnInit {
  data: QuizResponse[] = [];
  fUnidad: number | null = null;
  
  constructor(
    private api: QuizzesService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() { 
    this.load(); 
  }

  load() { 
    this.api.listar(this.fUnidad ?? undefined).subscribe(r => this.data = r); 
  }

  del(q: QuizResponse) { 
    if(confirm('¿Estás seguro de eliminar esta evaluación?')) { 
      this.api.eliminar(q.id).subscribe(() => this.load()); 
    } 
  }

  // Métodos de navegación
  navigateToNew() {
    console.log('Navegando a nuevo');
    this.router.navigate(['nuevo'], { relativeTo: this.route });
  }

  editQuiz(id: number) {
    console.log('Navegando a editar:', id);
    this.router.navigate([id, 'editar'], { relativeTo: this.route });
  }

  assignQuiz(id: number) {
    console.log('Navegando a asignar:', id);
    this.router.navigate([id, 'asignar'], { relativeTo: this.route });
  }

  managePermissions(id: number) {
    console.log('Navegando a permisos:', id);
    this.router.navigate([id, 'permisos'], { relativeTo: this.route });
  }

  trackByQuiz(index: number, quiz: QuizResponse): number {
    return quiz.id;
  }
}
