import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EstudiantesService, Estudiante } from './estudiantes.service';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface Unidad {
  id: number;
  nombre: string;
  descripcion: string;
  orden: number;
  habilitada: boolean;
  nota?: number;
  aprobado?: boolean;
}

@Component({
  selector: 'app-estudiantes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="dashboard-container">
    <!-- Header Section -->
    <div class="dashboard-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="dashboard-title">👥 Estudiantes</h1>
          <p class="dashboard-subtitle">Gestiona y visualiza información de los estudiantes registrados en la plataforma</p>
        </div>
        <div class="header-stats">
          <div class="stat-card">
            <div class="stat-value">{{ estudiantesFiltrados.length }}</div>
            <div class="stat-label">📊 Total</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Search Section -->
    <div class="search-section">
      <div class="search-container">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            [(ngModel)]="busqueda"
            (input)="filtrarEstudiantes()"
            placeholder="Buscar por nombre, apellido, email o usuario..."
            class="search-input"
          />
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Table Container -->
      <div class="table-container">
        <div class="table-header">
          <h3 class="table-title">📋 Lista de Estudiantes</h3>
          <div class="table-info">
            <span class="results-count">{{ estudiantesFiltrados.length }} estudiante(s) encontrado(s)</span>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="estudiantes-table">
            <thead>
              <tr>
                <th>👤 Estudiante</th>
                <th>📧 Email</th>
                <th>🏙️ Ciudad</th>
                <th>📱 Teléfono</th>
                <th>📚 Unidades</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let estudiante of estudiantesFiltrados; trackBy: trackByEstudiante" class="estudiante-row">
                <td class="estudiante-info">
                  <div class="student-profile">
                    <div class="student-avatar">
                      <span class="avatar-text">{{ getInitials(estudiante.nombres + ' ' + estudiante.apellidos) }}</span>
                    </div>
                    <div class="student-details">
                      <span class="student-name">{{ estudiante.nombres }} {{ estudiante.apellidos }}</span>
                      <span class="student-username">@{{ estudiante.username }}</span>
                    </div>
                  </div>
                </td>
                <td class="estudiante-email">
                  <span class="email-text">{{ estudiante.email }}</span>
                </td>
                <td class="estudiante-ciudad">
                  <div class="location-info">
                    <span class="location-icon">🏙️</span>
                    <span class="location-text">{{ estudiante.ciudad || 'No especificada' }}</span>
                  </div>
                </td>
                <td class="estudiante-telefono">
                  <div class="phone-info">
                    <span class="phone-icon">📱</span>
                    <span class="phone-text">{{ estudiante.telefono || 'No especificado' }}</span>
                  </div>
                </td>
                <td class="estudiante-unidades">
                  <button class="units-btn" (click)="abrirModalUnidades(estudiante)" title="Gestionar Unidades">
                    <span class="btn-icon">📚</span>
                    <span class="btn-text">Unidades</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="estudiantesFiltrados.length === 0 && !busqueda" class="empty-state">
        <div class="empty-icon">👥</div>
        <h3 class="empty-title">No hay estudiantes registrados</h3>
        <p class="empty-description">Cuando se registren estudiantes, aparecerán aquí</p>
      </div>

      <!-- No Results State -->
      <div *ngIf="estudiantesFiltrados.length === 0 && busqueda" class="no-results-state">
        <div class="no-results-icon">🔍</div>
        <h3 class="no-results-title">No se encontraron resultados</h3>
        <p class="no-results-description">Intenta con otros términos de búsqueda</p>
        <button class="clear-search-btn" (click)="clearSearch()">
          <span class="btn-icon">🔄</span>
          Limpiar búsqueda
        </button>
      </div>
    </div>

    <!-- Modal para gestionar unidades -->
    <div class="modal-overlay" *ngIf="mostrarModalUnidades" (click)="cerrarModalUnidades()">
      <div class="modal-container" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="modal-title-section">
            <h3 class="modal-title">📚 Gestionar Unidades</h3>
            <p class="modal-subtitle">{{ estudianteSeleccionado?.nombres }} {{ estudianteSeleccionado?.apellidos }}</p>
          </div>
          <button class="modal-close-btn" (click)="cerrarModalUnidades()">
            <span class="close-icon">✕</span>
          </button>
        </div>
        
        <div class="modal-body">
          <!-- Loading State -->
          <div *ngIf="cargandoUnidades" class="modal-loading">
            <div class="loading-spinner">⏳</div>
            <p class="loading-text">Cargando unidades...</p>
          </div>

          <!-- Units List -->
          <div *ngIf="!cargandoUnidades && unidadesEstudiante.length > 0" class="units-list">
            <div *ngFor="let unidad of unidadesEstudiante; trackBy: trackByUnidad" class="unit-card">
              <div class="unit-info">
                <h4 class="unit-title">{{ unidad.nombre }}</h4>
                <p class="unit-description">{{ unidad.descripcion }}</p>
                <div class="unit-metrics">
                  <div class="metric-badge note">
                    <span class="metric-icon">📊</span>
                    <span class="metric-text">Nota: {{ unidad.nota ?? '—' }}</span>
                  </div>
                  <div class="metric-badge" [class.approved]="unidad.aprobado" [class.pending]="!unidad.aprobado">
                    <span class="metric-icon">{{ unidad.aprobado ? '✅' : '⏳' }}</span>
                    <span class="metric-text">{{ unidad.aprobado ? 'Aprobado' : 'Pendiente' }}</span>
                  </div>
                </div>
              </div>
              <div class="unit-actions">
                <button 
                  class="toggle-btn"
                  [class.enabled]="unidad.habilitada"
                  [class.disabled]="!unidad.habilitada"
                  [class.loading]="cargandoUnidad === unidad.id"
                  (click)="toggleUnidadEstudiante(unidad.id)"
                  [disabled]="cargandoUnidad === unidad.id">
                  <span class="toggle-icon">{{ unidad.habilitada ? '🔓' : '🔒' }}</span>
                  <span class="toggle-text">{{ unidad.habilitada ? 'Habilitada' : 'Deshabilitada' }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Empty Units State -->
          <div *ngIf="!cargandoUnidades && unidadesEstudiante.length === 0" class="empty-units">
            <div class="empty-units-icon">📚</div>
            <h4 class="empty-units-title">No hay unidades disponibles</h4>
            <p class="empty-units-description">Este estudiante no tiene unidades asignadas</p>
          </div>
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

    .header-stats {
      display: flex;
      gap: 1rem;
    }

    .stat-card {
      background: rgba(102, 126, 234, 0.1);
      border: 1px solid rgba(102, 126, 234, 0.2);
      border-radius: 15px;
      padding: 1rem 1.5rem;
      text-align: center;
      min-width: 100px;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--primary-color);
      margin-bottom: 0.3rem;
    }

    .stat-label {
      font-size: 0.9rem;
      color: var(--text-secondary);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Search Section */
    .search-section {
      margin-bottom: 2rem;
    }

    .search-container {
      display: flex;
      justify-content: center;
    }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: 15px;
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(255, 255, 255, 0.2);
      overflow: hidden;
      max-width: 500px;
      width: 100%;
    }

    .search-icon {
      position: absolute;
      left: 1.5rem;
      font-size: 1.2rem;
      color: var(--text-secondary);
      z-index: 1;
    }

    .search-input {
      width: 100%;
      padding: 1.2rem 1.5rem 1.2rem 4rem;
      border: none;
      background: transparent;
      color: var(--text-primary);
      font-size: 1rem;
      outline: none;
    }

    .search-input::placeholder {
      color: var(--text-secondary);
    }

    /* Main Content */
    .main-content {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    /* Table Container */
    .table-container {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(255, 255, 255, 0.2);
      overflow: hidden;
    }

    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 2rem;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
    }

    .table-title {
      font-size: 1.4rem;
      font-weight: 700;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .table-info {
      display: flex;
      align-items: center;
    }

    .results-count {
      background: rgba(255, 255, 255, 0.2);
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 600;
    }

    /* Table */
    .table-wrapper {
      overflow-x: auto;
    }

    .estudiantes-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
    }

    .estudiantes-table th {
      background: rgba(248, 250, 252, 0.8);
      color: var(--text-primary);
      padding: 1.2rem 1rem;
      text-align: left;
      font-weight: 700;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid rgba(226, 232, 240, 0.5);
    }

    .estudiante-row {
      transition: var(--transition);
      border-bottom: 1px solid rgba(226, 232, 240, 0.3);
    }

    .estudiante-row:hover {
      background: rgba(102, 126, 234, 0.05);
    }

    .estudiantes-table td {
      padding: 1.2rem 1rem;
      vertical-align: middle;
    }

    /* Student Profile */
    .student-profile {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .student-avatar {
      width: 45px;
      height: 45px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    }

    .avatar-text {
      color: white;
      font-weight: 700;
      font-size: 1rem;
    }

    .student-details {
      display: flex;
      flex-direction: column;
    }

    .student-name {
      font-weight: 600;
      color: var(--text-primary);
      font-size: 1rem;
    }

    .student-username {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .email-text {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    /* Location and Phone Info */
    .location-info, .phone-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .location-icon, .phone-icon {
      font-size: 1.2rem;
    }

    .location-text, .phone-text {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    /* Units Button */
    .units-btn {
      background: linear-gradient(135deg, var(--success-color), #059669);
      color: white;
      border: none;
      border-radius: 12px;
      padding: 0.8rem 1.2rem;
      cursor: pointer;
      transition: var(--transition);
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .units-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
    }

    .btn-icon {
      font-size: 1.1rem;
    }

    .btn-text {
      font-weight: 700;
    }


    /* Empty States */
    .empty-state, .no-results-state {
      text-align: center;
      padding: 4rem 2rem;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .empty-icon, .no-results-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.6;
    }

    .empty-title, .no-results-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 1rem 0;
    }

    .empty-description, .no-results-description {
      font-size: 1.1rem;
      color: var(--text-secondary);
      margin: 0 0 2rem 0;
    }

    .clear-search-btn {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
      border: none;
      border-radius: 12px;
      padding: 1rem 2rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition);
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .clear-search-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 2rem;
    }

    .modal-container {
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.2);
      max-width: 700px;
      width: 100%;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2rem;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
    }

    .modal-title-section {
      flex: 1;
    }

    .modal-title {
      font-size: 1.4rem;
      font-weight: 700;
      margin: 0 0 0.5rem 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .modal-subtitle {
      font-size: 1rem;
      margin: 0;
      opacity: 0.9;
    }

    .modal-close-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      cursor: pointer;
      transition: var(--transition);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-close-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.1);
    }

    .close-icon {
      color: white;
      font-size: 1.2rem;
      font-weight: 700;
    }

    .modal-body {
      flex: 1;
      padding: 2rem;
      overflow-y: auto;
    }

    /* Modal Loading */
    .modal-loading {
      text-align: center;
      padding: 3rem;
    }

    .loading-spinner {
      font-size: 3rem;
      margin-bottom: 1rem;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .loading-text {
      font-size: 1.1rem;
      color: var(--text-secondary);
      margin: 0;
    }

    /* Units List */
    .units-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .unit-card {
      background: rgba(248, 250, 252, 0.8);
      border: 1px solid rgba(226, 232, 240, 0.5);
      border-radius: 15px;
      padding: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: var(--transition);
    }

    .unit-card:hover {
      background: rgba(102, 126, 234, 0.05);
      border-color: rgba(102, 126, 234, 0.2);
    }

    .unit-info {
      flex: 1;
      min-width: 0;
    }

    .unit-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 0.5rem 0;
    }

    .unit-description {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin: 0 0 1rem 0;
      line-height: 1.4;
    }

    .unit-metrics {
      display: flex;
      gap: 0.8rem;
      flex-wrap: wrap;
    }

    .metric-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.4rem 0.8rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .metric-badge.note {
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
      border: 1px solid rgba(59, 130, 246, 0.2);
    }

    .metric-badge.approved {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success-color);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .metric-badge.pending {
      background: rgba(245, 158, 11, 0.1);
      color: var(--warning-color);
      border: 1px solid rgba(245, 158, 11, 0.2);
    }

    .metric-icon {
      font-size: 0.9rem;
    }

    .metric-text {
      font-size: 0.8rem;
    }

    /* Unit Actions */
    .unit-actions {
      margin-left: 1rem;
    }

    .toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.8rem 1.2rem;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      transition: var(--transition);
      font-weight: 600;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      min-width: 140px;
      justify-content: center;
    }

    .toggle-btn.enabled {
      background: linear-gradient(135deg, var(--success-color), #059669);
      color: white;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
    }

    .toggle-btn.enabled:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
    }

    .toggle-btn.disabled {
      background: linear-gradient(135deg, var(--error-color), #dc2626);
      color: white;
      box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
    }

    .toggle-btn.disabled:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4);
    }

    .toggle-btn.loading {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .toggle-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
    }

    .toggle-icon {
      font-size: 1rem;
    }

    .toggle-text {
      font-size: 0.8rem;
    }

    /* Empty Units */
    .empty-units {
      text-align: center;
      padding: 3rem;
    }

    .empty-units-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      opacity: 0.6;
    }

    .empty-units-title {
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 0.5rem 0;
    }

    .empty-units-description {
      font-size: 1rem;
      color: var(--text-secondary);
      margin: 0;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .dashboard-container {
        padding: 2rem 1rem;
      }

      .header-content {
        flex-direction: column;
        gap: 1.5rem;
        text-align: center;
      }

      .search-box {
        max-width: 100%;
      }

      .table-header {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }

      .estudiantes-table {
        font-size: 0.8rem;
      }

      .estudiantes-table th,
      .estudiantes-table td {
        padding: 0.8rem 0.5rem;
      }

      .student-profile {
        flex-direction: column;
        gap: 0.5rem;
        text-align: center;
      }

      .student-avatar {
        width: 35px;
        height: 35px;
      }


      .modal-container {
        margin: 1rem;
        max-height: 90vh;
      }

      .modal-header {
        padding: 1.5rem;
      }

      .modal-body {
        padding: 1.5rem;
      }

      .unit-card {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }

      .unit-actions {
        margin-left: 0;
      }
    }
  `]
})
export class EstudiantesComponent implements OnInit {
  estudiantes: Estudiante[] = [];
  estudiantesFiltrados: Estudiante[] = [];
  busqueda: string = '';
  
  // Variables para modal de unidades
  mostrarModalUnidades = false;
  estudianteSeleccionado: Estudiante | null = null;
  unidadesEstudiante: Unidad[] = [];
  cargandoUnidades = false;
  cargandoUnidad: number | null = null;

  constructor(
    private estudiantesService: EstudiantesService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.estudiantesService.getEstudiantes().subscribe((data) => {
      this.estudiantes = data;
      this.estudiantesFiltrados = data;
    });
  }

  filtrarEstudiantes(): void {
    const filtro = this.busqueda.trim().toLowerCase();
    if (!filtro) {
      this.estudiantesFiltrados = this.estudiantes;
      return;
    }
    this.estudiantesFiltrados = this.estudiantes.filter(est =>
      est.nombres.toLowerCase().includes(filtro) ||
      est.apellidos.toLowerCase().includes(filtro) ||
      est.email.toLowerCase().includes(filtro) ||
      est.username.toLowerCase().includes(filtro)
    );
  }

  abrirModalUnidades(estudiante: Estudiante): void {
    this.estudianteSeleccionado = estudiante;
    this.mostrarModalUnidades = true;
    this.cargarUnidadesEstudiante(estudiante.username);
  }

  cerrarModalUnidades(): void {
    this.mostrarModalUnidades = false;
    this.estudianteSeleccionado = null;
    this.unidadesEstudiante = [];
  }

  cargarUnidadesEstudiante(username: string): void {
    this.cargandoUnidades = true;
    const token = localStorage.getItem('token');
    const url = `${environment.apiUrl}/auth/estudiantes/${username}/unidades/estado`;
    this.http.get<Unidad[]>(url, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (unidades) => {
        this.unidadesEstudiante = unidades;
        this.cargandoUnidades = false;
      },
      error: (error) => {
        console.error('Error cargando unidades:', error);
        this.cargandoUnidades = false;
      }
    });
  }

  toggleUnidadEstudiante(unidadId: number): void {
    if (!this.estudianteSeleccionado) return;
    
    this.cargandoUnidad = unidadId;
    const token = localStorage.getItem('token');
    const url = `${environment.apiUrl}/auth/estudiantes/${this.estudianteSeleccionado.username}/unidades/${unidadId}/toggle`;
    this.http.put(url, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (response: any) => {
        // Actualizar estado local
        const unidad = this.unidadesEstudiante.find(u => u.id === unidadId);
        if (unidad) {
          unidad.habilitada = response.habilitada;
        }
        this.cargandoUnidad = null;
      },
      error: (error) => {
        console.error('Error toggling unidad:', error);
        this.cargandoUnidad = null;
      }
    });
  }

  getInitials(fullName: string): string {
    return fullName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  clearSearch(): void {
    this.busqueda = '';
    this.filtrarEstudiantes();
  }

  trackByEstudiante(index: number, estudiante: Estudiante): string {
    return estudiante.username;
  }

  trackByUnidad(index: number, unidad: Unidad): number {
    return unidad.id;
  }
}
