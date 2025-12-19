import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AnalyticsService, ResumenResponse, UnidadAnalytics } from '../services/analytics.service';
import { AttendanceService } from '../services/attendance.service';
import { DashboardLayoutComponent } from '../dashboard-layout/dashboard-layout.component';

interface Metrica {
  titulo: string;
  valor: string | number;
  descripcion: string;
}

@Component({
  selector: 'app-analisis-estudiante',
  standalone: true,
  imports: [CommonModule, FormsModule, DashboardLayoutComponent],
  template: `
  <ng-container *ngIf="useStudentLayout; else plainContent">
    <app-dashboard-layout>
      <ng-container [ngTemplateOutlet]="coreContent"></ng-container>
    </app-dashboard-layout>
  </ng-container>

  <ng-template #plainContent>
    <ng-container [ngTemplateOutlet]="coreContent"></ng-container>
  </ng-template>

  <ng-template #coreContent>
    <div class="dashboard-container">
      <!-- Header Section -->
      <div class="dashboard-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="dashboard-title">📊 Análisis del Estudiante</h1>
            <p class="dashboard-subtitle">Monitorea el progreso y rendimiento académico</p>
          </div>
          <div class="header-stats" *ngIf="!cargandoResumen">
            <div class="stat-card">
              <div class="stat-value">{{ progreso }}%</div>
              <div class="stat-label">📈 Progreso</div>
            </div>
            <div class="stat-card" *ngIf="metricas.length > 0">
              <div class="stat-value">{{ metricas[0]?.valor || 0 }}</div>
              <div class="stat-label">📚 Completadas</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Student Selector (Empresa/Profesor only) -->
      <div *ngIf="tipoUsuario === 'empresa' || tipoUsuario === 'profesor'" class="selector-section">
        <div class="selector-container">
          <div class="selector-header">
            <h3 class="selector-title">🔍 Buscar Estudiante</h3>
            <p class="selector-subtitle">Selecciona un estudiante para ver su análisis detallado</p>
          </div>
          
          <div class="selector-form">
            <div class="form-group">
              <label class="form-label">👤 Estudiante</label>
              <select [(ngModel)]="selectedUsername" class="form-select">
                <option value="">Selecciona un estudiante...</option>
                <option *ngFor="let estudiante of estudiantes; trackBy: trackByEstudiante" [value]="estudiante.username">
                  {{ estudiante.nombres }} {{ estudiante.apellidos }} ({{ estudiante.username }})
                </option>
              </select>
            </div>
            
            <div class="form-actions">
              <button class="search-btn" (click)="irAUsuario()" [disabled]="!selectedUsername">
                <span class="btn-icon">🔍</span>
                <span class="btn-text">Buscar Análisis</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading States -->
      <div *ngIf="cargandoResumen || cargandoUnidades" class="loading-section">
        <div class="loading-card">
          <div class="loading-spinner"></div>
          <h3 class="loading-title">Cargando análisis...</h3>
          <p class="loading-subtitle">Procesando datos del estudiante</p>
        </div>
      </div>

      <!-- Progress Overview -->
      <div *ngIf="!cargandoResumen" class="progress-section">
        <div class="progress-container">
          <div class="progress-header">
            <h3 class="progress-title">📈 Progreso General</h3>
            <div class="progress-percentage">{{ progreso }}%</div>
          </div>
          
          <div class="progress-bar-container">
            <div class="progress-bar">
              <div class="progress-fill" [style.width.%]="progreso" [style.background]="getProgressColor(progreso)"></div>
            </div>
            <div class="progress-labels">
              <span class="progress-start">0%</span>
              <span class="progress-end">100%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Attendance Progress (student only) -->
      <div *ngIf="tipoUsuario === 'estudiante' && !cargandoAsistencia" class="progress-section">
        <div class="progress-container">
          <div class="progress-header">
            <h3 class="progress-title">✅ Asistencia a Clases</h3>
            <div class="progress-percentage">{{ asistenciaPorcentaje }}%</div>
          </div>

          <div class="progress-bar-container">
            <div class="progress-bar">
              <div class="progress-fill" [style.width.%]="asistenciaPorcentaje" [style.background]="getProgressColor(asistenciaPorcentaje)"></div>
            </div>
            <div class="progress-labels">
              <span class="progress-start">
                {{ asistenciaPresentes }} presentes
              </span>
              <span class="progress-end" *ngIf="asistenciaProgramadas">
                {{ asistenciaConRegistro }} con registro / {{ asistenciaProgramadas }} programadas
              </span>
            </div>
          </div>

          <div *ngIf="asistenciaNivel" class="attendance-alert" [ngClass]="asistenciaNivel">
            <div class="attendance-alert-header">
              <div class="attendance-alert-icon">
                {{ asistenciaNivel === 'alta' ? '✅' : (asistenciaNivel === 'media' ? '⚠️' : '❌') }}
              </div>
              <div class="attendance-alert-title">
                Estado de asistencia: {{ asistenciaNivelLabel }}
              </div>
            </div>
            <p class="attendance-alert-message">
              {{ asistenciaMensaje }}
            </p>
          </div>
        </div>
      </div>

      <!-- Metrics Grid -->
      <div *ngIf="!cargandoResumen && metricas.length > 0" class="metrics-section">
        <div class="section-header">
          <h2 class="section-title">📊 Métricas Clave</h2>
          <div class="section-subtitle">Indicadores de rendimiento y dedicación</div>
        </div>

        <div class="metrics-grid">
          <div *ngFor="let metrica of metricas; trackBy: trackByMetrica" class="metric-card">
            <div class="metric-icon">{{ getMetricIcon(metrica.titulo) }}</div>
            <div class="metric-content">
              <div class="metric-title">{{ metrica.titulo }}</div>
              <div class="metric-value">{{ metrica.valor }}</div>
              <div class="metric-description">{{ metrica.descripcion }}</div>
            </div>
          </div>
        </div>

        <!-- Botones de Debug (temporal) -->
        <div class="debug-section" style="margin-top: 2rem; text-align: center; padding: 1rem; background: rgba(255,255,255,0.9); border-radius: 12px; border: 2px dashed #667eea;">
          <h4 style="color: #667eea; margin-bottom: 1rem;">🔧 Debug Racha de Estudio</h4>
          <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
            <button 
              (click)="debugActividad()" 
              style="padding: 0.5rem 1rem; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9rem;">
              🔍 Ver Actividades
            </button>
            <button 
              (click)="registrarActividadTest()" 
              style="padding: 0.5rem 1rem; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9rem;">
              ✅ Registrar Actividad Test
            </button>
          </div>
          <p style="font-size: 0.8rem; color: #6b7280; margin-top: 0.5rem; margin-bottom: 0;">
            Estos botones son temporales para diagnosticar el problema de la racha
          </p>
        </div>
      </div>

      <!-- Units Progress -->
      <div *ngIf="!cargandoUnidades" class="units-section">
        <div class="section-header">
          <h2 class="section-title">📚 Progreso por Unidad</h2>
          <div class="section-subtitle">Análisis detallado del rendimiento en cada unidad</div>
        </div>

        <div class="units-grid" [class.profesor-layout]="tipoUsuario === 'profesor'">
          <div 
            *ngFor="let unidad of unidadesProgreso; let idx = index; trackBy: trackByUnidad" 
            class="unit-card">
            
            <!-- Unit Header -->
            <div class="unit-header">
              <div class="unit-info">
                <h3 class="unit-title">{{ unidad.nombre }}</h3>
                <div class="unit-progress-badge" [style.background]="getProgressColor(unidad.progreso)">
                  {{ unidad.progreso }}%
                </div>
              </div>
            </div>
            
            <!-- Progress Bar -->
            <div class="unit-progress-container">
              <div class="unit-progress-bar">
                <div 
                  class="unit-progress-fill" 
                  [style.width.%]="unidad.progreso" 
                  [style.background]="getProgressColor(unidad.progreso)"
                  [title]="tooltipFor(unidad)">
                </div>
              </div>
            </div>
            
            <!-- Unit Stats -->
            <div class="unit-stats">
              <div class="stat-item">
                <div class="stat-icon">⏱️</div>
                <div class="stat-content">
                  <div class="stat-label">Tiempo</div>
                  <div class="stat-value">{{ unidad.tiempo }}</div>
                </div>
              </div>
              
              <div class="stat-item">
                <div class="stat-icon">📝</div>
                <div class="stat-content">
                  <div class="stat-label">Tareas</div>
                  <div class="stat-value">{{ unidad.tareas_count || 0 }}</div>
                </div>
              </div>
              
              <div class="stat-item">
                <div class="stat-icon">📊</div>
                <div class="stat-content">
                  <div class="stat-label">Promedio</div>
                  <div class="stat-value">{{ unidad.promedio_tareas != null ? (unidad.promedio_tareas | number:'1.0-0') + '/100' : '—' }}</div>
                </div>
              </div>
              
              <div class="stat-item">
                <div class="stat-icon">🎯</div>
                <div class="stat-content">
                  <div class="stat-label">Score Final</div>
                  <div class="stat-value">{{ unidad.score_final != null ? (unidad.score_final | number:'1.0-0') + '/100' : '—' }}</div>
                </div>
              </div>
            </div>
            
            <!-- Last Activity -->
            <div class="unit-activity" *ngIf="unidad.ultima_entrega">
              <div class="activity-icon">📅</div>
              <div class="activity-content">
                <div class="activity-label">Última entrega</div>
                <div class="activity-date">{{ unidad.ultima_entrega | date:'short' }}</div>
              </div>
            </div>
            
            <!-- Action Button -->
            <div class="unit-actions">
              <button class="view-tasks-btn" (click)="verTareas(idx)">
                <span class="btn-icon">👁️</span>
                <span class="btn-text">Ver Tareas</span>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Empty State -->
        <div *ngIf="unidadesProgreso.length === 0" class="empty-state">
          <div class="empty-icon">📚</div>
          <h3 class="empty-title">No hay datos de unidades disponibles</h3>
          <p class="empty-description" *ngIf="tipoUsuario === 'estudiante'">
            Comienza a trabajar en las unidades para ver tu progreso aquí
          </p>
          <p class="empty-description" *ngIf="tipoUsuario === 'empresa' || tipoUsuario === 'profesor'">
            {{ selectedUsername ? 'El estudiante seleccionado no tiene datos de progreso' : 'Selecciona un estudiante para ver su análisis' }}
          </p>
        </div>
      </div>
    </div>
  </ng-template>
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
      padding: 8rem 2rem 2rem 2rem;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      max-width: 1320px;
      margin: 0 auto;
    }

    /* Header Section */
    .dashboard-header {
      margin-bottom: 2rem;
    }

    .header-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
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

    /* Selector Section */
    .selector-section {
      margin-bottom: 2rem;
    }

    .selector-container {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      padding: 2rem;
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .selector-header {
      margin-bottom: 1.5rem;
      text-align: center;
    }

    .selector-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 0.5rem 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .selector-subtitle {
      font-size: 1rem;
      color: var(--text-secondary);
      margin: 0;
    }

    .selector-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      align-items: center;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      width: 100%;
      max-width: 400px;
    }

    .form-label {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-primary);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .form-select {
      padding: 1rem;
      border: 2px solid rgba(102, 126, 234, 0.2);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.9);
      color: var(--text-primary);
      font-size: 1rem;
      transition: var(--transition);
      font-family: inherit;
    }

    .form-select:focus {
      outline: none;
      border-color: var(--primary-color);
      background: white;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-actions {
      display: flex;
      justify-content: center;
    }

    .search-btn {
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

    /* Loading Section */
    .loading-section {
      margin-bottom: 2rem;
    }

    .loading-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      padding: 3rem;
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(255, 255, 255, 0.2);
      text-align: center;
    }

    .loading-spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(102, 126, 234, 0.2);
      border-top: 4px solid var(--primary-color);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1.5rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .loading-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 0.5rem 0;
    }

    .loading-subtitle {
      font-size: 1rem;
      color: var(--text-secondary);
      margin: 0;
    }

    /* Progress Section */
    .progress-section {
      margin-bottom: 2rem;
    }

    .progress-container {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      padding: 2rem;
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .progress-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .progress-percentage {
      font-size: 2rem;
      font-weight: 700;
      color: var(--primary-color);
    }

    .progress-bar-container {
      position: relative;
    }

    .progress-bar {
      height: 20px;
      background: rgba(203, 213, 225, 0.3);
      border-radius: 10px;
      overflow: hidden;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .progress-fill {
      height: 100%;
      border-radius: 10px;
      transition: var(--transition);
      position: relative;
      overflow: hidden;
    }

    .progress-fill::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%);
      animation: shimmer 2s infinite;
    }

    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    .progress-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 0.5rem;
      font-size: 0.9rem;
      color: var(--text-secondary);
      font-weight: 600;
    }
    
    /* Attendance Alert */
    .attendance-alert {
      margin-top: 1.5rem;
      padding: 1.25rem 1.5rem;
      border-radius: 18px;
      border: 2px solid transparent;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.18);
      position: relative;
      overflow: hidden;
    }

    .attendance-alert::before {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: radial-gradient(circle at top left, rgba(255, 255, 255, 0.9) 0%, transparent 55%);
      opacity: 0.5;
    }

    .attendance-alert-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      position: relative;
      z-index: 1;
    }

    .attendance-alert-icon {
      width: 40px;
      height: 40px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      background: rgba(255, 255, 255, 0.95);
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.25);
      flex-shrink: 0;
    }

    .attendance-alert-title {
      font-size: 0.9rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #111827;
    }

    .attendance-alert-message {
      margin: 0.25rem 0 0 0;
      font-size: 0.95rem;
      line-height: 1.5;
      color: #111827;
      position: relative;
      z-index: 1;
    }

    .attendance-alert.alta {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(59, 130, 246, 0.12));
      border-color: rgba(16, 185, 129, 0.9);
    }

    .attendance-alert.media {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(251, 191, 36, 0.14));
      border-color: rgba(245, 158, 11, 0.95);
    }

    .attendance-alert.baja {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.24), rgba(248, 113, 113, 0.16));
      border-color: rgba(239, 68, 68, 0.98);
    }

    .attendance-alert.alta::after,
    .attendance-alert.media::after,
    .attendance-alert.baja::after {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 6px;
    }

    .attendance-alert.alta::after {
      background: #10b981;
    }

    .attendance-alert.media::after {
      background: #f59e0b;
    }

    .attendance-alert.baja::after {
      background: #ef4444;
    }

    /* Metrics Section */
    .metrics-section {
      margin-bottom: 2rem;
    }

    .section-header {
      margin-bottom: 2rem;
      text-align: center;
    }

    .section-title {
      font-size: 1.8rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 0.5rem 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .section-subtitle {
      font-size: 1.1rem;
      color: var(--text-secondary);
      margin: 0;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 2rem;
    }

    .metric-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      box-shadow: var(--card-shadow);
      border: 2px solid rgba(102, 126, 234, 0.2);
      padding: 2rem;
      transition: var(--transition);
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .metric-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      border-color: var(--primary-color);
      background: rgba(255, 255, 255, 0.98);
    }

    .metric-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
    }

    .metric-content {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .metric-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .metric-value {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--primary-color);
    }

    .metric-description {
      font-size: 0.9rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    /* Units Section */
    .units-section {
      margin-bottom: 2rem;
    }

    .units-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 2rem;
      padding: 1rem 0;
    }

    .units-grid.profesor-layout {
      grid-template-columns: repeat(2, minmax(400px, 1fr));
      justify-items: center;
    }

    .unit-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      box-shadow: var(--card-shadow);
      border: 2px solid rgba(102, 126, 234, 0.2);
      padding: 2rem;
      transition: var(--transition);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .unit-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      border-color: var(--primary-color);
      background: rgba(255, 255, 255, 0.98);
    }

    .unit-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--primary-color) 0%, var(--secondary-color) 100%);
      opacity: 0;
      transition: var(--transition);
    }

    .unit-card:hover::before {
      opacity: 1;
    }

    .unit-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .unit-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .unit-title {
      font-size: 1.3rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .unit-progress-badge {
      padding: 0.5rem 1rem;
      border-radius: 15px;
      color: white;
      font-size: 1rem;
      font-weight: 700;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    .unit-progress-container {
      width: 100%;
    }

    .unit-progress-bar {
      height: 16px;
      background: rgba(203, 213, 225, 0.3);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .unit-progress-fill {
      height: 100%;
      border-radius: 8px;
      transition: var(--transition);
      position: relative;
      overflow: hidden;
    }

    .unit-progress-fill::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%);
      animation: shimmer 2s infinite;
    }

    .unit-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.6);
      border-radius: 12px;
      border: 1px solid rgba(102, 126, 234, 0.1);
      transition: var(--transition);
    }

    .stat-item:hover {
      background: rgba(255, 255, 255, 0.9);
      border-color: var(--primary-color);
      transform: scale(1.02);
    }

    .stat-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .stat-content {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      flex: 1;
    }

    .stat-label {
      font-size: 0.8rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }

    .stat-value {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .unit-activity {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      padding: 1rem;
      background: rgba(102, 126, 234, 0.1);
      border-radius: 12px;
      border: 1px solid rgba(102, 126, 234, 0.2);
    }

    .activity-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .activity-content {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      flex: 1;
    }

    .activity-label {
      font-size: 0.8rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }

    .activity-date {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .unit-actions {
      display: flex;
      justify-content: center;
    }

    .view-tasks-btn {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
      border: none;
      border-radius: 12px;
      padding: 0.8rem 1.5rem;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition);
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .view-tasks-btn:hover {
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
      line-height: 1.5;
    }

    /* Responsive */
    @media (max-width: 900px) {
      .units-grid.profesor-layout {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .dashboard-container {
        padding: 2rem 1rem;
      }

      .header-content {
        flex-direction: column;
        gap: 1.5rem;
        text-align: center;
      }

      .units-grid {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }

      .unit-stats {
        grid-template-columns: 1fr;
      }

      .metrics-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 480px) {
      .dashboard-title {
        font-size: 1.8rem;
      }

      .unit-title {
        font-size: 1.1rem;
      }

      .stat-value {
        font-size: 1.5rem;
      }
    }
  `]
})
export class AnalisisEstudianteComponent implements OnInit {
  tipoUsuario: string = '';
  selectedUsername: string = '';
  estudiantes: any[] = [];
  // Controla si se debe envolver con el layout de estudiante (sidebar)
  useStudentLayout: boolean = false;
  
  // Datos del dashboard
  progreso: number = 0;
  metricas: Metrica[] = [];
  desempeno: any[] = [];
  unidadesProgreso: any[] = [];
  
  // Estados de carga
  cargandoResumen: boolean = false;
  cargandoUnidades: boolean = false;
  cargandoAsistencia: boolean = false;

  // Resumen de asistencia
  asistenciaPorcentaje: number = 0;
  asistenciaPresentes: number = 0;
  asistenciaAusentes: number = 0;
  asistenciaProgramadas: number = 0;
  asistenciaConRegistro: number = 0;
  asistenciaNivel: string = '';
  asistenciaNivelLabel: string = '';
  asistenciaMensaje: string = '';

  constructor(
    private analytics: AnalyticsService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private attendance: AttendanceService
  ) {
    // Detectar tipo de usuario
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.tipoUsuario = user.tipo_usuario || localStorage.getItem('tipo_usuario') || '';
  }

  verTareas(idx: number) {
    const item = this.unidadesProgreso[idx];
    if (!item || !item.unidad_id) return;
    const base = this.router.url.split('/')[1];
    // Estudiante: abre sus propias tareas
    if (this.tipoUsuario === 'estudiante') {
      this.router.navigate([`/${base}/tareas-unidad`, item.unidad_id]);
      return;
    }
    // Empresa/Profesor: requiere un estudiante seleccionado
    const username = this.selectedUsername;
    if (!username) {
      alert('Selecciona un estudiante para ver sus tareas.');
      return;
    }
    // Pasamos el username como query param para que el componente detalle consuma endpoint de empresa
    this.router.navigate([`/${base}/tareas-unidad`, item.unidad_id], { queryParams: { username } });
  }

  ngOnInit() {
    // Definir si usamos el layout del estudiante (para evitar sidebars duplicadas)
    const url = this.router.url;
    const insideDashboardWithSidebar = url.startsWith('/dashboard-empresa') ||
                                       url.startsWith('/dashboard-profesor') ||
                                       url.startsWith('/dashboard-estudiante');
    // Si NO estamos dentro de un dashboard con sidebar, usamos el layout del estudiante
    this.useStudentLayout = !insideDashboardWithSidebar;

    // Verificar si hay un parámetro de usuario en la URL
    this.route.params.subscribe(params => {
      if (params['username']) {
        this.selectedUsername = params['username'];
        this.cargarDatosEstudiante(this.selectedUsername);
      }
    });

    if (this.tipoUsuario === 'estudiante') {
      // Para estudiantes, cargar sus propios datos
      this.cargarDatosEstudiante();
      this.cargarAsistenciaEstudiante();
    } else if (this.tipoUsuario === 'empresa' || this.tipoUsuario === 'profesor') {
      // Para empresa/profesor, cargar lista de estudiantes
      this.cargarEstudiantes();
      // Si no hay parámetro de usuario, mostrar datos generales
      if (!this.selectedUsername) {
        this.cargarDatosEstudiante();
      }
    }
  }

  cargarEstudiantes() {
    // Cargar estudiantes reales desde el backend
    this.analytics.getEstudiantesUsernames().subscribe({
      next: (estudiantes) => {
        this.estudiantes = (estudiantes || []).map((est: any) => ({
          username: est.username,
          nombres: est.nombres,
          apellidos: est.apellidos
        }));
        // Auto-seleccionar el primero si es profesor/empresa y no hay selección
        if ((this.tipoUsuario === 'empresa' || this.tipoUsuario === 'profesor') && !this.selectedUsername && this.estudiantes.length > 0) {
          this.selectedUsername = this.estudiantes[0].username;
          // Cargar datos del primer estudiante para evitar usar el usuario del token
          this.cargarDatosEstudiante(this.selectedUsername);
        }
      },
      error: (error) => {
        console.error('Error cargando estudiantes:', error);
        this.estudiantes = [];
      }
    });
  }

  cargarDatosEstudiante(username?: string) {
    const targetUser = username || 'current';
    
    this.cargandoResumen = true;
    this.cargandoUnidades = true;

    const usernameResumen = username || (this.tipoUsuario === 'estudiante' ? (JSON.parse(localStorage.getItem('user') || '{}').username || localStorage.getItem('username')) : undefined);
    // Cargar resumen (si se especifica username usar endpoint por usuario, de lo contrario usar "current")
    const resumen$ = usernameResumen ? this.analytics.getResumen(usernameResumen) : this.analytics.getResumenEstudiante();
    resumen$.subscribe({
      next: (resumen: ResumenResponse) => {
        this.progreso = resumen.progreso_general;
        this.metricas = [
          { 
            titulo: 'Unidades completadas', 
            valor: resumen.unidades_completadas, 
            descripcion: 'Total completadas' 
          },
          { 
            titulo: 'Tiempo dedicado', 
            valor: `${Math.floor(resumen.tiempo_dedicado_min / 60)}h ${resumen.tiempo_dedicado_min % 60}m`, 
            descripcion: 'Tiempo total' 
          },
          { 
            titulo: 'Racha de estudio', 
            valor: resumen.racha_dias, 
            descripcion: 'Días seguidos' 
          }
        ];
        
        // Inicializar unidades de progreso
        this.inicializarUnidadesProgreso();
        this.cargandoResumen = false;
      },
      error: (error: any) => {
        console.error('Error cargando resumen:', error);
        this.cargandoResumen = false;
        // Datos de fallback
        this.progreso = 0;
        this.metricas = [
          { titulo: 'Unidades completadas', valor: 0, descripcion: 'Total completadas' },
          { titulo: 'Tiempo dedicado', valor: '0h 0m', descripcion: 'Tiempo total' },
          { titulo: 'Racha de estudio', valor: 0, descripcion: 'Días seguidos' }
        ];
        // Inicializar unidades de progreso incluso en caso de error
        this.inicializarUnidadesProgreso();
      }
    });

    // Cargar analytics por unidad (usar por-usuario si aplica)
    const unidades$ = usernameResumen ? this.analytics.getUnidades(usernameResumen) : this.analytics.getAnalyticsUnidades();
    unidades$.subscribe({
      next: (unidades: any[]) => {
        const clamp = (n: any) => Math.max(0, Math.min(100, Number(n || 0)));
        this.desempeno = (unidades || []).map(u => ({
          nombre: u?.nombre || `Unidad ${u?.unidad_id}`,
          score: clamp(u?.progreso_porcentaje ?? u?.porcentaje_completado)
        }));

        this.unidadesProgreso = (unidades || []).map(u => {
          const progreso = clamp(u?.progreso_porcentaje ?? u?.porcentaje_completado);
          const tiempoMin = Number(u?.tiempo_min ?? u?.tiempo_dedicado_min ?? 0);
          const scoreRaw = u?.score ?? u?.promedio_score ?? u?.score_promedio;
          const scoreNum = scoreRaw != null ? Number(scoreRaw) : null;
          const promedioRaw = u?.score_promedio != null ? u?.score_promedio : u?.promedio_score;
          const promedioNum = promedioRaw != null ? Number(promedioRaw) : null;
          const scoreFinal = u?.score_final != null ? Number(u?.score_final) : null;
          return {
            nombre: u?.nombre || `Unidad ${u?.unidad_id}`,
            progreso,
            tiempo: this.formatearMinutos(tiempoMin),
            score: scoreNum,
            promedio_tareas: promedioNum ?? scoreNum,
            score_final: scoreFinal,
            tareas_count: Number(u?.tareas_count ?? 0),
            score_promedio: promedioNum,
            ultima_entrega: u?.ultima_entrega || null,
            unidad_id: u?.unidad_id
          };
        });
        this.cargandoUnidades = false;
      },
      error: (error: any) => {
        console.error('Error cargando analytics de unidades:', error);
        this.cargandoUnidades = false;
        // Datos de fallback
        this.desempeno = [];
        this.unidadesProgreso = [];
      }
    });
  }

  private cargarAsistenciaEstudiante() {
    if (this.tipoUsuario !== 'estudiante') {
      this.cargandoAsistencia = false;
      return;
    }
    
    this.cargandoAsistencia = true;
    this.attendance.getAsistenciaResumenEstudiante().subscribe({
      next: (data) => {
        this.asistenciaProgramadas = Number(data?.total_programadas || 0);
        this.asistenciaConRegistro = Number(data?.con_registro || 0);
        this.asistenciaPresentes = Number(data?.presentes || 0);
        this.asistenciaAusentes = Number(data?.ausentes || 0);
        const pct = Number(data?.porcentaje || 0);
        this.asistenciaPorcentaje = isNaN(pct) ? 0 : pct;

        const nivelBackend = (data?.nivel_alerta || data?.nivel || '').toString();
        const nivel = nivelBackend || this.calcularNivelAsistencia(this.asistenciaPorcentaje, this.asistenciaConRegistro);
        this.asistenciaNivel = nivel;
        if (nivel === 'alta') {
          this.asistenciaNivelLabel = 'Alta';
          this.asistenciaMensaje = 'Excelente, estás asistiendo a casi todas tus clases. Mantén este ritmo.';
        } else if (nivel === 'media') {
          this.asistenciaNivelLabel = 'Media';
          this.asistenciaMensaje = 'Tu asistencia está en un nivel medio. Intenta no faltar para no afectar tu progreso.';
        } else if (nivel === 'baja') {
          this.asistenciaNivelLabel = 'Baja';
          this.asistenciaMensaje = 'Alerta: tu asistencia es baja. Podrías perder contenidos importantes, habla con tu profesor si lo necesitas.';
        } else {
          this.asistenciaNivel = '';
          this.asistenciaNivelLabel = '';
          this.asistenciaMensaje = '';
        }
        this.cargandoAsistencia = false;
      },
      error: (err) => {
        console.error('Error cargando resumen de asistencia:', err);
        this.asistenciaProgramadas = 0;
        this.asistenciaConRegistro = 0;
        this.asistenciaPresentes = 0;
        this.asistenciaAusentes = 0;
        this.asistenciaPorcentaje = 0;
        this.cargandoAsistencia = false;
      }
    });
  }

  irAUsuario() {
    if (!this.selectedUsername) {
      alert('Por favor selecciona un estudiante');
      return;
    }
    
    // Navegar con parámetro de usuario para actualizar la URL
    const currentRoute = this.router.url.split('/')[1]; // dashboard-empresa o dashboard-estudiante
    this.router.navigate([`/${currentRoute}/analisis-estudiante`, this.selectedUsername]);
    // Cargar de inmediato para no depender solo de la suscripción a params
    this.cargarDatosEstudiante(this.selectedUsername);
  }

  inicializarUnidadesProgreso() {
    // Fallback: dejar vacío si no hay datos reales
    this.unidadesProgreso = [];
  }

  // Tooltip con métricas clave de la unidad
  tooltipFor(unidad: any): string {
    const tareas = unidad?.tareas_count ?? 0;
    const tiempo = unidad?.tiempo ?? '0m';
    const prom = unidad?.score_promedio != null ? `${Math.round(unidad.score_promedio)}/100` : '—';
    const ultima = unidad?.ultima_entrega ? new Date(unidad.ultima_entrega).toLocaleString() : '—';
    return `Tareas: ${tareas}\nTiempo: ${tiempo}\nPromedio: ${prom}\nÚltima entrega: ${ultima}`;
  }

  private formatearMinutos(min: number): string {
    if (!min || min <= 0) return '0m';
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  private calcularNivelAsistencia(pct: number, conRegistro: number): string {
    if (!conRegistro || conRegistro <= 0) return 'sin_datos';
    if (pct >= 80) return 'alta';
    if (pct >= 60) return 'media';
    return 'baja';
  }

  getProgressColor(progress: number): string {
    if (progress >= 80) return 'linear-gradient(135deg, #10b981, #059669)';
    if (progress >= 60) return 'linear-gradient(135deg, #f59e0b, #d97706)';
    if (progress >= 40) return 'linear-gradient(135deg, #f97316, #ea580c)';
    return 'linear-gradient(135deg, #ef4444, #dc2626)';
  }

  getMetricIcon(titulo: string): string {
    if (titulo.toLowerCase().includes('unidades')) return '📚';
    if (titulo.toLowerCase().includes('tiempo')) return '⏱️';
    if (titulo.toLowerCase().includes('racha')) return '🔥';
    return '📊';
  }

  trackByEstudiante(index: number, estudiante: any): any {
    return estudiante.username || index;
  }

  trackByMetrica(index: number, metrica: any): any {
    return metrica.titulo || index;
  }

  trackByUnidad(index: number, unidad: any): any {
    return unidad.unidad_id || index;
  }

  // Métodos de debug para racha
  debugActividad() {
    const username = this.selectedUsername || (JSON.parse(localStorage.getItem('user') || '{}').username);
    if (!username) {
      alert('No hay usuario seleccionado');
      return;
    }

    this.analytics.debugActividad(username).subscribe({
      next: (data) => {
        console.log('🔍 Debug Actividad:', data);
        alert(`Debug Actividad:\n\nTotal actividades: ${data.total_actividades}\nDías únicos: ${data.dias_unicos_actividad}\nÚltimo día: ${data.ultimo_dia_actividad}\nDías desde última: ${data.dias_desde_ultima_actividad}\nRacha calculada: ${data.racha_calculada}`);
      },
      error: (error) => {
        console.error('Error en debug:', error);
        alert('Error obteniendo debug de actividad');
      }
    });
  }

  registrarActividadTest() {
    if (this.unidadesProgreso.length === 0) {
      alert('No hay unidades disponibles');
      return;
    }

    const unidadId = this.unidadesProgreso[0].unidad_id || 1;
    this.analytics.debugRegistrarActividad(unidadId).subscribe({
      next: (data) => {
        console.log('✅ Actividad registrada:', data);
        alert(`Actividad registrada!\n\nRacha actual: ${data.racha_actual} días\nProgreso: ${data.progreso_general}%\nTiempo total: ${data.tiempo_total} min`);
        // Recargar datos
        this.cargarDatosEstudiante(this.selectedUsername);
      },
      error: (error) => {
        console.error('Error registrando actividad:', error);
        alert('Error registrando actividad de prueba');
      }
    });
  }
}
