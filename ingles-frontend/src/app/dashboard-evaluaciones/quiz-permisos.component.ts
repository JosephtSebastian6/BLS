import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { QuizzesService } from '../services/quizzes.service';
import { EmpresaGruposService } from '../services/empresa-grupos.service';

@Component({
  selector: 'app-quiz-permisos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <div class="dashboard-container">
    <!-- Header Section -->
    <div class="dashboard-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="dashboard-title">🔐 Permisos de Evaluación</h1>
          <p class="dashboard-subtitle">Gestiona el acceso individual de estudiantes a la evaluación #{{ quizId }}</p>
        </div>
        <button class="btn-secondary" (click)="volver()">
          <span class="btn-icon">←</span>
          Volver
        </button>
      </div>
    </div>

    <!-- Info Section -->
    <div class="info-card">
      <div class="info-header">
        <span class="info-icon">💡</span>
        <h3>¿Cómo funcionan los permisos?</h3>
      </div>
      <div class="info-content">
        <div class="info-item">
          <span class="bullet">✅</span>
          <span><strong>Por defecto:</strong> Todos los estudiantes con la unidad habilitada pueden acceder</span>
        </div>
        <div class="info-item">
          <span class="bullet">❌</span>
          <span><strong>Deshabilitar:</strong> El estudiante NO verá esta evaluación en su lista</span>
        </div>
        <div class="info-item">
          <span class="bullet">🔄</span>
          <span><strong>Toggle:</strong> Cambia entre habilitado y deshabilitado fácilmente</span>
        </div>
      </div>
    </div>

    <!-- Search Section -->
    <div class="search-card">
      <div class="search-header">
        <h3>🔍 Buscar Estudiante</h3>
      </div>
      <div class="search-content">
        <div class="search-input-group">
          <div class="input-wrapper">
            <input 
              type="text" 
              [(ngModel)]="searchUsername" 
              placeholder="Ingresa el username del estudiante..."
              class="search-input"
              (keyup.enter)="buscarEstudiante()"
            />
            <span class="input-icon">👤</span>
          </div>
          <button class="btn-primary" (click)="buscarEstudiante()">
            <span class="btn-icon">🔍</span>
            Buscar
          </button>
        </div>
      </div>
    </div>

    <!-- Message Section -->
    <div *ngIf="mensaje" class="message-card" [class.success]="!mensajeError" [class.error]="mensajeError">
      <div class="message-content">
        <span class="message-icon">{{ mensajeError ? '⚠️' : '✅' }}</span>
        <span class="message-text">{{ mensaje }}</span>
      </div>
    </div>

    <!-- Student Card -->
    <div *ngIf="estudianteActual" class="student-card">
      <div class="student-header">
        <div class="student-avatar">
          <span class="avatar-text">{{ getInitials(estudianteActual.nombres, estudianteActual.apellidos) }}</span>
        </div>
        <div class="student-info">
          <h3 class="student-name">{{ estudianteActual.nombres }} {{ estudianteActual.apellidos }}</h3>
          <div class="student-details">
            <span class="detail-item">
              <span class="detail-icon">👤</span>
              <strong>{{ estudianteActual.username }}</strong>
            </span>
            <span class="detail-item">
              <span class="detail-icon">📧</span>
              {{ estudianteActual.email }}
            </span>
          </div>
        </div>
      </div>
      
      <div class="permission-section">
        <div class="permission-status">
          <span class="status-label">Estado actual:</span>
          <span class="status-badge" [class.enabled]="estudianteActual.permisoHabilitado" [class.disabled]="!estudianteActual.permisoHabilitado">
            {{ estudianteActual.permisoHabilitado ? '✅ Habilitado' : '❌ Deshabilitado' }}
          </span>
        </div>
        <button 
          class="permission-toggle-btn" 
          [class.enabled]="estudianteActual.permisoHabilitado"
          [class.disabled]="!estudianteActual.permisoHabilitado"
          (click)="togglePermiso(estudianteActual.username)">
          <span class="toggle-icon">{{ estudianteActual.permisoHabilitado ? '🔒' : '🔓' }}</span>
          {{ estudianteActual.permisoHabilitado ? 'Deshabilitar Acceso' : 'Habilitar Acceso' }}
        </button>
      </div>
    </div>

    <!-- Permissions List -->
    <div class="permissions-card">
      <div class="permissions-header">
        <h3>📋 Permisos Configurados</h3>
        <span class="permissions-count">{{ permisosConfigurados.length }} estudiantes</span>
      </div>
      
      <div *ngIf="permisosConfigurados.length === 0" class="empty-permissions">
        <div class="empty-icon">🎯</div>
        <h4>Sin restricciones configuradas</h4>
        <p>Todos los estudiantes pueden acceder por defecto. Busca un estudiante para configurar permisos específicos.</p>
      </div>

      <div *ngIf="permisosConfigurados.length > 0" class="permissions-list">
        <div class="permission-item" *ngFor="let p of permisosConfigurados">
          <div class="permission-info">
            <span class="permission-username">{{ p.username }}</span>
            <span class="permission-status" [class.enabled]="p.habilitado" [class.disabled]="!p.habilitado">
              {{ p.habilitado ? '✅ Habilitado' : '❌ Deshabilitado' }}
            </span>
          </div>
          <button class="permission-action-btn" (click)="togglePermiso(p.username)">
            <span class="action-icon">🔄</span>
            Toggle
          </button>
        </div>
      </div>
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
      --success-color: #10b981;
      --error-color: #ef4444;
      --warning-color: #f59e0b;
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
      font-size: 2.2rem;
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

    .btn-secondary {
      background: rgba(255, 255, 255, 0.9);
      color: var(--text-primary);
      border: 2px solid rgba(102, 126, 234, 0.2);
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
    }

    .btn-secondary:hover {
      background: var(--primary-color);
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
      border: none;
      border-radius: 12px;
      padding: 1rem 1.5rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
    }

    .btn-icon {
      font-size: 1.2rem;
    }

    /* Info Card */
    .info-card {
      background: rgba(240, 249, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(186, 230, 253, 0.3);
    }

    .info-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .info-icon {
      font-size: 2rem;
    }

    .info-header h3 {
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }

    .info-content {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.7);
      border-radius: 12px;
      border: 1px solid rgba(186, 230, 253, 0.2);
    }

    .bullet {
      font-size: 1.2rem;
      min-width: 24px;
    }

    /* Search Card */
    .search-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .search-header h3 {
      font-size: 1.3rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 1.5rem 0;
    }

    .search-input-group {
      display: flex;
      gap: 1rem;
      align-items: flex-end;
    }

    .input-wrapper {
      flex: 1;
      position: relative;
    }

    .search-input {
      width: 100%;
      padding: 1rem 3rem 1rem 1rem;
      border: 2px solid rgba(102, 126, 234, 0.1);
      border-radius: 12px;
      font-size: 1rem;
      background: white;
      transition: var(--transition);
    }

    .search-input:focus {
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

    /* Message Card */
    .message-card {
      border-radius: 15px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      box-shadow: var(--card-shadow);
      backdrop-filter: blur(20px);
      border: 1px solid;
    }

    .message-card.success {
      background: rgba(209, 250, 229, 0.95);
      border-color: rgba(110, 231, 183, 0.3);
    }

    .message-card.error {
      background: rgba(254, 226, 226, 0.95);
      border-color: rgba(252, 165, 165, 0.3);
    }

    .message-content {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .message-icon {
      font-size: 1.5rem;
    }

    .message-text {
      font-weight: 600;
      color: var(--text-primary);
    }

    /* Student Card */
    .student-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .student-header {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .student-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 1.5rem;
      text-transform: uppercase;
    }

    .student-info {
      flex: 1;
    }

    .student-name {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 1rem 0;
    }

    .student-details {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-secondary);
    }

    .detail-icon {
      font-size: 1rem;
    }

    .permission-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      background: rgba(248, 250, 252, 0.8);
      border-radius: 15px;
      border: 1px solid rgba(226, 232, 240, 0.5);
    }

    .permission-status {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .status-label {
      font-weight: 600;
      color: var(--text-primary);
    }

    .status-badge {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .status-badge.enabled {
      background: rgba(209, 250, 229, 0.8);
      color: #065f46;
      border: 1px solid #6ee7b7;
    }

    .status-badge.disabled {
      background: rgba(254, 226, 226, 0.8);
      color: #991b1b;
      border: 1px solid #fca5a5;
    }

    .permission-toggle-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 2rem;
      border: 2px solid;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .permission-toggle-btn.enabled {
      background: rgba(254, 226, 226, 0.8);
      color: #991b1b;
      border-color: #fca5a5;
    }

    .permission-toggle-btn.disabled {
      background: rgba(209, 250, 229, 0.8);
      color: #065f46;
      border-color: #6ee7b7;
    }

    .permission-toggle-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .toggle-icon {
      font-size: 1.2rem;
    }

    /* Permissions Card */
    .permissions-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      padding: 2rem;
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .permissions-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .permissions-header h3 {
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }

    .permissions-count {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 600;
    }

    .empty-permissions {
      text-align: center;
      padding: 3rem 2rem;
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .empty-permissions h4 {
      font-size: 1.3rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 1rem 0;
    }

    .empty-permissions p {
      color: var(--text-secondary);
      margin: 0;
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
    }

    .permissions-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .permission-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      background: rgba(248, 250, 252, 0.8);
      border-radius: 15px;
      border: 1px solid rgba(226, 232, 240, 0.5);
      transition: var(--transition);
    }

    .permission-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    }

    .permission-info {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .permission-username {
      font-weight: 700;
      color: var(--text-primary);
      font-size: 1.1rem;
    }

    .permission-status {
      font-weight: 600;
      font-size: 0.9rem;
    }

    .permission-status.enabled {
      color: var(--success-color);
    }

    .permission-status.disabled {
      color: var(--error-color);
    }

    .permission-action-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.8rem 1.5rem;
      background: linear-gradient(135deg, var(--warning-color), #d97706);
      color: white;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .permission-action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
    }

    .action-icon {
      font-size: 1rem;
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

      .search-input-group {
        flex-direction: column;
        align-items: stretch;
      }

      .student-header {
        flex-direction: column;
        text-align: center;
      }

      .permission-section {
        flex-direction: column;
        gap: 1rem;
      }

      .permission-item {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }
    }
  `]
})
export class QuizPermisosComponent implements OnInit {
  quizId!: number;
  searchUsername: string = '';
  estudianteActual: any = null;
  permisosConfigurados: Array<{ username: string; habilitado: boolean }> = [];
  mensaje: string = '';
  mensajeError: boolean = false;

  constructor(
    private quizzesService: QuizzesService,
    private gruposService: EmpresaGruposService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.quizId = Number(this.route.snapshot.paramMap.get('id'));
  }

  buscarEstudiante() {
    if (!this.searchUsername.trim()) {
      this.mostrarMensaje('Ingresa un username', true);
      return;
    }

    // Buscar estudiante en la lista de estudiantes
    this.gruposService.listarEstudiantes().subscribe({
      next: (estudiantes) => {
        const estudiante = estudiantes.find(e => 
          e.username?.toLowerCase() === this.searchUsername.trim().toLowerCase()
        );
        
        if (estudiante) {
          this.estudianteActual = estudiante;
          this.verificarPermisoActual(estudiante.username);
        } else {
          this.mostrarMensaje('Estudiante no encontrado', true);
          this.estudianteActual = null;
        }
      },
      error: () => {
        this.mostrarMensaje('Error al buscar estudiante', true);
      }
    });
  }

  verificarPermisoActual(username: string) {
    this.quizzesService.listarPermisosQuizEstudiante(username).subscribe({
      next: (permisos) => {
        const permiso = permisos.find(p => p.quiz_id === this.quizId);
        // Si no existe permiso = habilitado por defecto
        this.estudianteActual.permisoHabilitado = permiso ? permiso.habilitado : true;
      },
      error: () => {
        // Si hay error, asumir habilitado por defecto
        this.estudianteActual.permisoHabilitado = true;
      }
    });
  }

  togglePermiso(username: string) {
    this.quizzesService.togglePermisoQuizEstudiante(username, this.quizId).subscribe({
      next: (response) => {
        this.mostrarMensaje(response.mensaje, false);
        
        // Actualizar estado local
        if (this.estudianteActual && this.estudianteActual.username === username) {
          this.estudianteActual.permisoHabilitado = response.habilitado;
        }
        
        // Recargar lista de permisos configurados
        this.cargarPermisosConfigurados();
      },
      error: (err) => {
        this.mostrarMensaje(err?.error?.detail || 'Error al cambiar permiso', true);
      }
    });
  }

  cargarPermisosConfigurados() {
    // Aquí podrías cargar todos los estudiantes y verificar sus permisos
    // Por ahora solo mostramos un mensaje
    this.mensaje = 'Permiso actualizado correctamente';
  }

  mostrarMensaje(msg: string, esError: boolean = false) {
    this.mensaje = msg;
    this.mensajeError = esError;
    setTimeout(() => {
      this.mensaje = '';
    }, 3000);
  }

  volver() {
    const seg = this.router.url.split('/')[1] || 'dashboard-profesor';
    this.router.navigate([`/${seg}/quizzes`]);
  }

  getInitials(nombres: string, apellidos: string): string {
    const firstInitial = nombres ? nombres.charAt(0).toUpperCase() : '';
    const lastInitial = apellidos ? apellidos.charAt(0).toUpperCase() : '';
    return `${firstInitial}${lastInitial}`;
  }
}
