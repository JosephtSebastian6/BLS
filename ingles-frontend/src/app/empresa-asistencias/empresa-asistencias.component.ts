import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from '../services/attendance.service';

@Component({
  selector: 'app-empresa-asistencias',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
  <div class="dashboard-container">
    <!-- Header Section -->
    <div class="dashboard-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="dashboard-title">📊 Asistencias por Clase</h1>
          <p class="dashboard-subtitle">Monitorea y gestiona las asistencias de estudiantes en las diferentes clases</p>
        </div>
        <div class="header-stats">
          <div class="stat-card">
            <div class="stat-value">{{ clases.length }}</div>
            <div class="stat-label">📚 Clases</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters Section -->
    <div class="filters-section">
      <div class="filters-container">
        <h3 class="filters-title">🔍 Filtros de Búsqueda</h3>
        <div class="filters-group">
          <div class="filter-item">
            <label class="filter-label">📅 Desde</label>
            <input type="date" [(ngModel)]="desde" class="filter-input">
          </div>
          <div class="filter-item">
            <label class="filter-label">📅 Hasta</label>
            <input type="date" [(ngModel)]="hasta" class="filter-input">
          </div>
          <div class="filter-actions">
            <button class="search-btn" (click)="buscar()" [disabled]="loading">
              <span class="btn-icon">{{ loading ? '⏳' : '🔍' }}</span>
              <span class="btn-text">{{ loading ? 'Buscando...' : 'Buscar' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div *ngIf="loading" class="loading-container">
      <div class="loading-spinner">⏳</div>
      <h3 class="loading-title">Cargando Asistencias</h3>
      <p class="loading-text">Obteniendo información de clases...</p>
    </div>

    <!-- Error State -->
    <div *ngIf="error" class="error-container">
      <div class="error-icon">❌</div>
      <h3 class="error-title">Error al Cargar</h3>
      <p class="error-text">{{ error }}</p>
      <button class="retry-btn" (click)="buscar()">
        <span class="btn-icon">🔄</span>
        Reintentar
      </button>
    </div>

    <!-- Empty State -->
    <div *ngIf="!loading && !error && clases.length === 0" class="empty-state">
      <div class="empty-icon">📚</div>
      <h3 class="empty-title">No hay clases en el rango seleccionado</h3>
      <p class="empty-description">Intenta ajustar las fechas de búsqueda</p>
    </div>

    <!-- Main Content -->
    <div *ngIf="!loading && !error && clases.length > 0" class="main-content">
      <!-- Table Container -->
      <div class="table-container">
        <div class="table-header">
          <h3 class="table-title">📋 Lista de Clases</h3>
          <div class="table-info">
            <span class="results-count">{{ clases.length }} clase(s) encontrada(s)</span>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="asistencias-table">
            <thead>
              <tr>
                <th>📅 Fecha</th>
                <th>⏰ Hora</th>
                <th>📚 Tema</th>
                <th>👨‍🏫 Profesor</th>
                <th>👥 Inscritos</th>
                <th>✅ Presentes</th>
                <th>❌ Ausentes</th>
                <th>📊 Estado</th>
                <th>👁️ Ver</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let clase of clases; trackBy: trackByClase" class="clase-row">
                <td class="clase-fecha">
                  <div class="date-info">
                    <span class="date-icon">📅</span>
                    <span class="date-text">{{ clase.dia }}</span>
                  </div>
                </td>
                <td class="clase-hora">
                  <div class="time-info">
                    <span class="time-icon">⏰</span>
                    <span class="time-text">{{ clase.hora }}</span>
                  </div>
                </td>
                <td class="clase-tema">
                  <span class="tema-text">{{ clase.tema }}</span>
                </td>
                <td class="clase-profesor">
                  <div class="professor-info">
                    <div class="professor-avatar">
                      <span class="avatar-text">{{ getInitials(clase.profesor_username) }}</span>
                    </div>
                    <span class="professor-name">{{ clase.profesor_username }}</span>
                  </div>
                </td>
                <td class="clase-inscritos">
                  <div class="count-badge total">
                    <span class="count-icon">👥</span>
                    <span class="count-text">{{ clase.total_inscritos }}</span>
                  </div>
                </td>
                <td class="clase-presentes">
                  <div class="count-badge present">
                    <span class="count-icon">✅</span>
                    <span class="count-text">{{ clase.presentes }}</span>
                  </div>
                </td>
                <td class="clase-ausentes">
                  <div class="count-badge absent">
                    <span class="count-icon">❌</span>
                    <span class="count-text">{{ clase.ausentes }}</span>
                  </div>
                </td>
                <td class="clase-estado">
                  <span class="status-badge" [class.published]="clase.tiene_asistencia" [class.pending]="!clase.tiene_asistencia">
                    <span class="status-icon">{{ clase.tiene_asistencia ? '✅' : '⏳' }}</span>
                    {{ clase.tiene_asistencia ? 'Publicada' : 'Pendiente' }}
                  </span>
                </td>
                <td class="clase-acciones">
                  <button class="view-btn" (click)="verAsistencia(clase)" title="Ver detalle de asistencia">
                    <span class="btn-icon">👁️</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Detalle Asistencia -->
    <div class="modal-overlay" *ngIf="modalVisible" (click)="cerrarModal()">
      <div class="modal-container" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="modal-title-section">
            <h3 class="modal-title">📊 Detalle de Asistencia</h3>
            <p class="modal-subtitle" *ngIf="asistencia">{{ asistencia.tema }}</p>
          </div>
          <button class="modal-close-btn" (click)="cerrarModal()">
            <span class="close-icon">✕</span>
          </button>
        </div>
        
        <div class="modal-body">
          <!-- Loading State -->
          <div *ngIf="detalleLoading" class="modal-loading">
            <div class="loading-spinner">⏳</div>
            <p class="loading-text">Cargando detalle de asistencia...</p>
          </div>

          <!-- Error State -->
          <div *ngIf="detalleError" class="modal-error">
            <div class="error-icon">❌</div>
            <p class="error-text">{{ detalleError }}</p>
          </div>

          <!-- Attendance Detail -->
          <div *ngIf="!detalleLoading && !detalleError && asistencia" class="attendance-detail">
            <!-- Summary Cards -->
            <div class="summary-cards">
              <div class="summary-card info">
                <div class="summary-icon">📅</div>
                <div class="summary-content">
                  <div class="summary-label">Fecha y Hora</div>
                  <div class="summary-value">{{ asistencia.fecha }} - {{ asistencia.hora }}</div>
                </div>
              </div>
              <div class="summary-card present">
                <div class="summary-icon">✅</div>
                <div class="summary-content">
                  <div class="summary-label">Presentes</div>
                  <div class="summary-value">{{ asistencia.presentes_count || (asistencia.presentes?.length || 0) }}</div>
                </div>
              </div>
              <div class="summary-card absent">
                <div class="summary-icon">❌</div>
                <div class="summary-content">
                  <div class="summary-label">Ausentes</div>
                  <div class="summary-value">{{ asistencia.ausentes_count || 0 }}</div>
                </div>
              </div>
              <div class="summary-card total">
                <div class="summary-icon">👥</div>
                <div class="summary-content">
                  <div class="summary-label">Total</div>
                  <div class="summary-value">{{ asistencia.total || 0 }}</div>
                </div>
              </div>
            </div>

            <!-- Students List -->
            <div class="students-section">
              <h4 class="students-title">👥 Lista de Estudiantes</h4>
              <div class="students-table-wrapper">
                <table class="students-table">
                  <thead>
                    <tr>
                      <th>👤 Estudiante</th>
                      <th>🆔 Identificador</th>
                      <th>📊 Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let estudiante of (asistencia.detalle || []); trackBy: trackByEstudiante" class="student-row">
                      <td class="student-name">
                        <div class="student-info">
                          <div class="student-avatar" [class.present]="estudiante.presente" [class.absent]="!estudiante.presente">
                            <span class="avatar-text">{{ getInitials(estudiante.nombre) }}</span>
                          </div>
                          <span class="name-text">{{ estudiante.nombre }}</span>
                        </div>
                      </td>
                      <td class="student-id">
                        <span class="id-text">{{ estudiante.id || estudiante.email || estudiante.username || estudiante.identificador || estudiante.usuario || estudiante.correo }}</span>
                      </td>
                      <td class="student-status">
                        <span class="attendance-badge" [class.present]="estudiante.presente" [class.absent]="!estudiante.presente">
                          <span class="attendance-icon">{{ estudiante.presente ? '✅' : '❌' }}</span>
                          {{ estudiante.presente ? 'PRESENTE' : 'AUSENTE' }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
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

    /* Filters Section */
    .filters-section {
      margin-bottom: 2rem;
    }

    .filters-container {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      padding: 2rem;
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .filters-title {
      font-size: 1.3rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 1.5rem 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .filters-group {
      display: flex;
      gap: 2rem;
      align-items: end;
      flex-wrap: wrap;
    }

    .filter-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .filter-label {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-primary);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .filter-input {
      padding: 0.8rem 1rem;
      border: 2px solid rgba(102, 126, 234, 0.2);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.9);
      color: var(--text-primary);
      font-size: 1rem;
      transition: var(--transition);
      min-width: 150px;
    }

    .filter-input:focus {
      outline: none;
      border-color: var(--primary-color);
      background: white;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .filter-actions {
      display: flex;
      align-items: end;
    }

    .search-btn {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
      border: none;
      border-radius: 12px;
      padding: 0.8rem 2rem;
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

    .search-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
    }

    .search-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }

    .btn-icon {
      font-size: 1.1rem;
    }

    .btn-text {
      font-size: 0.9rem;
    }

    /* Loading State */
    .loading-container {
      text-align: center;
      padding: 4rem 2rem;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .loading-spinner {
      font-size: 4rem;
      margin-bottom: 1rem;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .loading-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 1rem 0;
    }

    .loading-text {
      font-size: 1.1rem;
      color: var(--text-secondary);
      margin: 0;
    }

    /* Error State */
    .error-container {
      text-align: center;
      padding: 4rem 2rem;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .error-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .error-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--error-color);
      margin: 0 0 1rem 0;
    }

    .error-text {
      font-size: 1.1rem;
      color: var(--text-secondary);
      margin: 0 0 2rem 0;
    }

    .retry-btn {
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

    .retry-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
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
      opacity: 0.6;
    }

    .empty-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 1rem 0;
    }

    .empty-description {
      font-size: 1.1rem;
      color: var(--text-secondary);
      margin: 0;
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

    .asistencias-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
    }

    .asistencias-table th {
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

    .clase-row {
      transition: var(--transition);
      border-bottom: 1px solid rgba(226, 232, 240, 0.3);
    }

    .clase-row:hover {
      background: rgba(102, 126, 234, 0.05);
    }

    .asistencias-table td {
      padding: 1.2rem 1rem;
      vertical-align: middle;
    }

    /* Table Cell Styles */
    .date-info, .time-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .date-icon, .time-icon {
      font-size: 1.2rem;
    }

    .date-text, .time-text {
      color: var(--text-secondary);
      font-size: 0.9rem;
      font-weight: 600;
    }

    .tema-text {
      color: var(--text-primary);
      font-weight: 600;
      font-size: 1rem;
    }

    .professor-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .professor-avatar {
      width: 35px;
      height: 35px;
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
      font-size: 0.8rem;
    }

    .professor-name {
      color: var(--text-primary);
      font-weight: 600;
      font-size: 0.9rem;
    }

    /* Count Badges */
    .count-badge {
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

    .count-badge.total {
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
      border: 1px solid rgba(59, 130, 246, 0.2);
    }

    .count-badge.present {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success-color);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .count-badge.absent {
      background: rgba(239, 68, 68, 0.1);
      color: var(--error-color);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .count-icon {
      font-size: 1rem;
    }

    .count-text {
      font-size: 0.9rem;
      font-weight: 700;
    }

    /* Status Badge */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .status-badge.published {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success-color);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .status-badge.pending {
      background: rgba(245, 158, 11, 0.1);
      color: var(--warning-color);
      border: 1px solid rgba(245, 158, 11, 0.2);
    }

    .status-icon {
      font-size: 1rem;
    }

    /* View Button */
    .view-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: var(--transition);
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
      border: 1px solid rgba(59, 130, 246, 0.2);
    }

    .view-btn:hover {
      background: #3b82f6;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
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
      max-width: 900px;
      width: 100%;
      max-height: 90vh;
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

    .modal-error {
      text-align: center;
      padding: 3rem;
    }

    /* Summary Cards */
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .summary-card {
      background: rgba(248, 250, 252, 0.8);
      border: 1px solid rgba(226, 232, 240, 0.5);
      border-radius: 15px;
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: var(--transition);
    }

    .summary-card:hover {
      background: rgba(102, 126, 234, 0.05);
      border-color: rgba(102, 126, 234, 0.2);
    }

    .summary-card.info {
      border-left: 4px solid #3b82f6;
    }

    .summary-card.present {
      border-left: 4px solid var(--success-color);
    }

    .summary-card.absent {
      border-left: 4px solid var(--error-color);
    }

    .summary-card.total {
      border-left: 4px solid var(--primary-color);
    }

    .summary-icon {
      font-size: 2rem;
      opacity: 0.8;
    }

    .summary-content {
      flex: 1;
    }

    .summary-label {
      font-size: 0.8rem;
      color: var(--text-secondary);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.3rem;
    }

    .summary-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    /* Students Section */
    .students-section {
      margin-top: 2rem;
    }

    .students-title {
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 1.5rem 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .students-table-wrapper {
      background: rgba(248, 250, 252, 0.8);
      border: 1px solid rgba(226, 232, 240, 0.5);
      border-radius: 15px;
      overflow: hidden;
    }

    .students-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
    }

    .students-table th {
      background: rgba(102, 126, 234, 0.1);
      color: var(--text-primary);
      padding: 1rem;
      text-align: left;
      font-weight: 700;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .student-row {
      transition: var(--transition);
      border-bottom: 1px solid rgba(226, 232, 240, 0.3);
    }

    .student-row:hover {
      background: rgba(102, 126, 234, 0.05);
    }

    .students-table td {
      padding: 1rem;
      vertical-align: middle;
    }

    .student-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .student-avatar {
      width: 35px;
      height: 35px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .student-avatar.present {
      background: linear-gradient(135deg, var(--success-color), #059669);
    }

    .student-avatar.absent {
      background: linear-gradient(135deg, var(--error-color), #dc2626);
    }

    .name-text {
      color: var(--text-primary);
      font-weight: 600;
      font-size: 1rem;
    }

    .id-text {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    /* Attendance Badge */
    .attendance-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .attendance-badge.present {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success-color);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .attendance-badge.absent {
      background: rgba(239, 68, 68, 0.1);
      color: var(--error-color);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .attendance-icon {
      font-size: 1rem;
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

      .filters-group {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
      }

      .filter-input {
        min-width: auto;
      }

      .table-header {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }

      .asistencias-table {
        font-size: 0.8rem;
      }

      .asistencias-table th,
      .asistencias-table td {
        padding: 0.8rem 0.5rem;
      }

      .professor-info {
        flex-direction: column;
        gap: 0.5rem;
        text-align: center;
      }

      .professor-avatar {
        width: 30px;
        height: 30px;
      }

      .modal-container {
        margin: 1rem;
        max-height: 95vh;
      }

      .modal-header {
        padding: 1.5rem;
      }

      .modal-body {
        padding: 1.5rem;
      }

      .summary-cards {
        grid-template-columns: 1fr;
      }

      .students-table {
        font-size: 0.8rem;
      }

      .student-info {
        flex-direction: column;
        gap: 0.5rem;
        text-align: center;
      }

      .student-avatar {
        width: 30px;
        height: 30px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmpresaAsistenciasComponent implements OnInit {
  desde = '';
  hasta = '';
  loading = false;
  error = '';
  clases: any[] = [];

  // Modal asistencia
  modalVisible = false;
  detalleLoading = false;
  detalleError = '';
  asistencia: any = null;

  constructor(private attendance: AttendanceService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Rango por defecto: últimos 30 días
    const hoy = new Date();
    const hace30 = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
    this.desde = hace30.toISOString().slice(0, 10);
    this.hasta = hoy.toISOString().slice(0, 10);
    this.buscar();
  }

  buscar() {
    this.loading = true;
    this.error = '';
    this.attendance.getEmpresaClases(this.desde, this.hasta).subscribe({
      next: (rows) => { this.clases = rows || []; this.loading = false; console.log('Empresa clases:', rows); this.cdr.markForCheck(); },
      error: (e) => { this.error = 'No se pudo cargar el listado'; this.loading = false; console.error('Error getEmpresaClases', e); this.cdr.markForCheck(); }
    });
  }

  verAsistencia(clase: any) {
    this.modalVisible = true;
    this.detalleLoading = true;
    this.detalleError = '';
    this.asistencia = null;
    this.attendance.getAsistenciaEmpresa(clase.id).subscribe({
      next: (data) => {
        if (!data) data = {};
        // Fallback: normalizar estructura
        data.detalle = Array.isArray(data.detalle) ? data.detalle : [];
        // Aceptar múltiples campos provenientes del backend para "presentes"
        const posibles = [
          data.presentes,
          data.presentes_ids,
          data.presentes_emails,
          data.presentes_usernames,
          data.lista_presentes,
          data.alumnos_presentes,
          data.students_present,
        ].filter(Boolean).flat();
        data.presentes = Array.isArray(posibles) ? posibles : [];

        // El backend ya calcula correctamente el estado 'presente' para cada estudiante
        // Solo necesitamos asegurar que el detalle tenga la estructura correcta
        try {
          // Si el backend ya envió detalle con 'presente', confiar en ese valor
          if (Array.isArray(data.detalle) && data.detalle.length > 0) {
            // Asegurar que cada elemento tenga el campo 'presente' como boolean
            data.detalle = data.detalle.map((d: any) => ({
              ...d,
              presente: Boolean(d?.presente)
            }));
          }
          
          // Recalcular contadores basados en el detalle
          const presentesCount = data.detalle.filter((x: any) => x.presente).length;
          data.presentes_count = presentesCount;
          data.ausentes_count = data.detalle.length - presentesCount;
          data.total = data.detalle.length;
        } catch {}

        this.asistencia = data;
        this.detalleLoading = false;
        console.log('Empresa asistencia detalle:', data);
        this.cdr.markForCheck();
      },
      error: (e) => { this.detalleError = 'No se pudo cargar la asistencia'; this.detalleLoading = false; console.error('Error getAsistenciaEmpresa', e); this.cdr.markForCheck(); }
    });
  }

  cerrarModal() {
    this.modalVisible = false;
    this.asistencia = null;
  }

  getInitials(name: string): string {
    if (!name) return '??';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  trackByClase(index: number, clase: any): any {
    return clase.id || index;
  }

  trackByEstudiante(index: number, estudiante: any): any {
    return estudiante.id || estudiante.email || estudiante.username || index;
  }

  // Nota: el template usa d.presente tras normalización
}
