import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AnalyticsService } from '../services/analytics.service';
import { GradingV2Service } from '../services/grading-v2.service';

interface KPI {
  label: string;
  value: string;
  sub?: string;
  icon?: string;
}

interface UnidadResumen {
  nombre: string;
  avance: number; // porcentaje
  estudiantes: number;
  tendencia: 'up' | 'down' | 'flat';
}

interface ActividadItem {
  usuario: string;
  evento: string;
  fecha: string; // ISO o legible
}

@Component({
  selector: 'app-home-resumen-empresa',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
  <div class="dashboard-container">
    <!-- Header Section -->
    <div class="dashboard-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="dashboard-title">🏢 Dashboard Empresa</h1>
          <p class="dashboard-subtitle">Visión general del aprendizaje en la organización</p>
        </div>
        <div class="header-controls">
          <div class="time-filters">
            <button 
              class="filter-btn" 
              [class.active]="selectedRange==='7d'" 
              (click)="setRange('7d')">
              📅 7 días
            </button>
            <button 
              class="filter-btn" 
              [class.active]="selectedRange==='30d'" 
              (click)="setRange('30d')">
              📊 30 días
            </button>
            <button 
              class="filter-btn" 
              [class.active]="selectedRange==='90d'" 
              (click)="setRange('90d')">
              📈 90 días
            </button>
          </div>
          <div class="custom-range" *ngIf="selectedRange === 'custom'">
            <input 
              type="date" 
              [(ngModel)]="startDate" 
              (change)="onDateChange('start', $any($event.target).value)"
              class="date-input">
            <span class="date-separator">—</span>
            <input 
              type="date" 
              [(ngModel)]="endDate" 
              (change)="onDateChange('end', $any($event.target).value)"
              class="date-input">
          </div>
        </div>
      </div>
    </div>

    <!-- KPI Grid -->
    <div class="kpi-section">
      <div class="section-header">
        <h2 class="section-title">📊 Métricas Clave</h2>
        <div class="section-subtitle">Indicadores principales de rendimiento organizacional</div>
      </div>

      <div class="kpi-grid">
        <div 
          *ngFor="let kpi of kpis; trackBy: trackByKpi" 
          class="kpi-card">
          
          <div class="kpi-icon">{{ getKpiIcon(kpi.icon) }}</div>
          
          <div class="kpi-content">
            <div class="kpi-label">{{ kpi.label }}</div>
            <div class="kpi-value">{{ kpi.value }}</div>
            <div class="kpi-sub" *ngIf="kpi.sub">{{ kpi.sub }}</div>
          </div>
          
          <div class="kpi-trend">
            <div class="trend-indicator positive">
              <span class="trend-icon">📈</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Performance Distribution -->
    <div class="distribution-section">
      <div class="section-header">
        <h2 class="section-title">🎯 Distribución de Desempeño</h2>
        <div class="section-subtitle">Análisis del rendimiento general de estudiantes</div>
      </div>

      <div class="distribution-container">
        <div class="donut-container">
          <div class="donut-wrapper">
            <svg viewBox="0 0 120 120" class="donut-chart">
              <circle class="donut-ring" cx="60" cy="60" r="45"/>
              <circle 
                class="donut-segment alto" 
                cx="60" cy="60" r="45" 
                [attr.stroke-dasharray]="altoDash" />
              <circle 
                class="donut-segment medio" 
                cx="60" cy="60" r="45" 
                [attr.stroke-dasharray]="medioDash" 
                [attr.stroke-dashoffset]="medioOffset"/>
              <circle 
                class="donut-segment bajo" 
                cx="60" cy="60" r="45" 
                [attr.stroke-dasharray]="bajoDash" 
                [attr.stroke-dashoffset]="bajoOffset"/>
              <text x="60" y="64" text-anchor="middle" class="donut-center">100%</text>
            </svg>
          </div>
          
          <div class="donut-legend">
            <div class="legend-item">
              <div class="legend-color alto"></div>
              <div class="legend-content">
                <div class="legend-label">Alto Rendimiento</div>
                <div class="legend-value">{{ pctAlto }}%</div>
              </div>
            </div>
            <div class="legend-item">
              <div class="legend-color medio"></div>
              <div class="legend-content">
                <div class="legend-label">Rendimiento Medio</div>
                <div class="legend-value">{{ pctMedio }}%</div>
              </div>
            </div>
            <div class="legend-item">
              <div class="legend-color bajo"></div>
              <div class="legend-content">
                <div class="legend-label">Bajo Rendimiento</div>
                <div class="legend-value">{{ pctBajo }}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Units Progress -->
    <div class="units-section">
      <div class="section-header">
        <h2 class="section-title">📚 Progreso por Unidades</h2>
        <div class="section-subtitle">Avance detallado en cada unidad de aprendizaje</div>
      </div>

      <div class="units-grid">
        <div 
          *ngFor="let unidad of unidades; trackBy: trackByUnidad" 
          class="unit-card">
          
          <!-- Unit Header -->
          <div class="unit-header">
            <div class="unit-info">
              <h3 class="unit-title">{{ unidad.nombre }}</h3>
              <div class="unit-progress-badge" [style.background]="getProgressColor(unidad.avance)">
                {{ unidad.avance }}%
              </div>
            </div>
            <div class="unit-trend" [class.positive]="unidad.tendencia === 'up'" [class.negative]="unidad.tendencia === 'down'">
              {{ getTrendIcon(unidad.tendencia) }}
            </div>
          </div>
          
          <!-- Progress Bar -->
          <div class="unit-progress-container">
            <div class="unit-progress-bar">
              <div 
                class="unit-progress-fill" 
                [style.width.%]="unidad.avance" 
                [style.background]="getProgressColor(unidad.avance)">
              </div>
            </div>
          </div>
          
          <!-- Unit Stats -->
          <div class="unit-stats">
            <div class="stat-item">
              <div class="stat-icon">👥</div>
              <div class="stat-content">
                <div class="stat-label">Estudiantes</div>
                <div class="stat-value">{{ unidad.estudiantes }}</div>
              </div>
            </div>
            
            <div class="stat-item">
              <div class="stat-icon">📊</div>
              <div class="stat-content">
                <div class="stat-label">Progreso</div>
                <div class="stat-value">{{ unidad.avance }}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Activity and Alerts -->
    <div class="activity-alerts-section">
      <!-- Recent Activity -->
      <div class="activity-container">
        <div class="section-header">
          <h3 class="section-title">🕒 Actividad Reciente</h3>
          <div class="section-subtitle">Últimas acciones de los estudiantes</div>
        </div>
        
        <div class="activity-list">
          <div 
            *ngFor="let actividad of actividadPaginada; trackBy: trackByActivity" 
            class="activity-item">
            
            <div class="activity-avatar">
              <div class="avatar-circle">{{ getInitials(actividad.usuario) }}</div>
            </div>
            
            <div class="activity-content">
              <div class="activity-text">
                <strong>{{ actividad.usuario }}</strong> {{ actividad.evento }}
              </div>
              <div class="activity-time">{{ actividad.fecha }}</div>
            </div>
            
            <div class="activity-icon">✅</div>
          </div>
        </div>

        <div class="activity-pagination" *ngIf="totalActivityPages > 1">
          <div class="activity-pagination-buttons">
            <button (click)="prevActivityPage()" [disabled]="activityPage === 1">Anterior</button>
            <button (click)="nextActivityPage()" [disabled]="activityPage === totalActivityPages">Siguiente</button>
          </div>
          <div class="activity-pagination-info">
            Página {{ activityPage }} de {{ totalActivityPages }}
          </div>
        </div>
      </div>

      <!-- Alerts -->
      <div class="alerts-container">
        <div class="section-header">
          <h3 class="section-title">⚠️ Alertas y Seguimiento</h3>
          <div class="section-subtitle">Estudiantes que requieren atención</div>
        </div>
        
        <div class="alerts-content">
          <!-- Low Progress Alert -->
          <div class="alert-group">
            <div class="alert-header">
              <div class="alert-icon warning">⚠️</div>
              <div class="alert-title">Bajo Progreso</div>
            </div>
            <div class="alert-chips">
              <div 
                *ngFor="let estudiante of alertas.bajoProgreso" 
                class="alert-chip warning">
                {{ estudiante }}
              </div>
            </div>
          </div>
          
          <!-- Inactive Students Alert -->
          <div class="alert-group">
            <div class="alert-header">
              <div class="alert-icon danger">🔴</div>
              <div class="alert-title">Inactivos (+7 días)</div>
            </div>
            <div class="alert-chips">
              <div 
                *ngFor="let estudiante of alertas.inactivos" 
                class="alert-chip danger">
                {{ estudiante }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="actions-section">
      <div class="section-header">
        <h2 class="section-title">🚀 Acciones Rápidas</h2>
        <div class="section-subtitle">Navegación directa a funciones principales</div>
      </div>

      <div class="actions-grid">
        <button class="action-btn primary" routerLink="/dashboard-empresa/analisis-estudiante">
          <div class="action-icon">📊</div>
          <div class="action-content">
            <div class="action-title">Análisis Detallado</div>
            <div class="action-subtitle">Ver métricas avanzadas</div>
          </div>
        </button>
        
        <button class="action-btn secondary" routerLink="/dashboard-empresa/estudiantes">
          <div class="action-icon">👥</div>
          <div class="action-content">
            <div class="action-title">Gestionar Estudiantes</div>
            <div class="action-subtitle">Administrar usuarios</div>
          </div>
        </button>
        
        <button class="action-btn tertiary" routerLink="/dashboard-empresa/unidades">
          <div class="action-icon">📚</div>
          <div class="action-content">
            <div class="action-title">Unidades de Aprendizaje</div>
            <div class="action-subtitle">Contenido educativo</div>
          </div>
        </button>
        
        <button class="action-btn quaternary" routerLink="/dashboard-empresa/asistencias">
          <div class="action-icon">✅</div>
          <div class="action-content">
            <div class="action-title">Control de Asistencias</div>
            <div class="action-subtitle">Seguimiento de clases</div>
          </div>
        </button>
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
      margin-bottom: 3rem;
    }

    .header-content {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      padding: 2.5rem;
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 2rem;
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
      font-size: 1.2rem;
      color: var(--text-secondary);
      margin: 0;
      font-weight: 400;
    }

    .header-controls {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      align-items: flex-end;
    }

    .time-filters {
      display: flex;
      gap: 0.5rem;
    }

    .filter-btn {
      background: rgba(255, 255, 255, 0.8);
      border: 2px solid rgba(102, 126, 234, 0.2);
      border-radius: 12px;
      padding: 0.8rem 1.2rem;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-primary);
      cursor: pointer;
      transition: var(--transition);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .filter-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.2);
      border-color: var(--primary-color);
    }

    .filter-btn.active {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
      border-color: var(--primary-color);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
    }

    .custom-range {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.9);
      border: 2px solid rgba(102, 126, 234, 0.2);
      border-radius: 12px;
      padding: 0.5rem 1rem;
    }

    .date-input {
      border: none;
      background: transparent;
      color: var(--text-primary);
      font-weight: 600;
      outline: none;
    }

    .date-separator {
      color: var(--text-secondary);
      font-weight: 600;
    }

    /* Section Headers */
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

    /* KPI Section */
    .kpi-section {
      margin-bottom: 3rem;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
    }

    .kpi-card {
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
      align-items: center;
      gap: 1.5rem;
    }

    .kpi-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      border-color: var(--primary-color);
      background: rgba(255, 255, 255, 0.98);
    }

    .kpi-icon {
      font-size: 3rem;
      flex-shrink: 0;
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
    }

    .kpi-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .kpi-label {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .kpi-value {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--primary-color);
    }

    .kpi-sub {
      font-size: 0.9rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .kpi-trend {
      flex-shrink: 0;
    }

    .trend-indicator {
      padding: 0.5rem;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.1);
    }

    .trend-icon {
      font-size: 1.5rem;
    }

    /* Distribution Section */
    .distribution-section {
      margin-bottom: 3rem;
    }

    .distribution-container {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      box-shadow: var(--card-shadow);
      border: 2px solid rgba(102, 126, 234, 0.2);
      padding: 2.5rem;
    }

    .donut-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3rem;
    }

    .donut-wrapper {
      flex-shrink: 0;
    }

    .donut-chart {
      width: 250px;
      height: 250px;
    }

    .donut-ring {
      fill: transparent;
      stroke: rgba(203, 213, 225, 0.3);
      stroke-width: 14;
    }

    .donut-segment {
      fill: transparent;
      stroke-width: 14;
      stroke-linecap: round;
      transform: rotate(-90deg);
      transform-origin: 50% 50%;
      transition: var(--transition);
    }

    .donut-segment.alto {
      stroke: var(--success-color);
    }

    .donut-segment.medio {
      stroke: var(--warning-color);
    }

    .donut-segment.bajo {
      stroke: var(--error-color);
    }

    .donut-center {
      font-weight: 700;
      fill: var(--text-primary);
      font-size: 1.2rem;
    }

    .donut-legend {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .legend-color {
      width: 20px;
      height: 20px;
      border-radius: 6px;
      flex-shrink: 0;
    }

    .legend-color.alto {
      background: var(--success-color);
    }

    .legend-color.medio {
      background: var(--warning-color);
    }

    .legend-color.bajo {
      background: var(--error-color);
    }

    .legend-content {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .legend-label {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .legend-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary-color);
    }

    /* Units Section */
    .units-section {
      margin-bottom: 3rem;
    }

    .units-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 2rem;
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
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      flex: 1;
    }

    .unit-progress-badge {
      padding: 0.5rem 1rem;
      border-radius: 15px;
      color: white;
      font-size: 1rem;
      font-weight: 700;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      margin-left: 1rem;
    }

    .unit-trend {
      font-size: 1.5rem;
      margin-left: 1rem;
    }

    .unit-trend.positive {
      color: var(--success-color);
    }

    .unit-trend.negative {
      color: var(--error-color);
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

    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
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
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    /* Activity and Alerts Section */
    .activity-alerts-section {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 2rem;
      margin-bottom: 3rem;
    }

    .activity-container,
    .alerts-container {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      box-shadow: var(--card-shadow);
      border: 2px solid rgba(102, 126, 234, 0.2);
      padding: 2rem;
    }

    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .activity-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.6);
      border-radius: 12px;
      border: 1px solid rgba(102, 126, 234, 0.1);
      transition: var(--transition);
    }

    .activity-item:hover {
      background: rgba(255, 255, 255, 0.9);
      border-color: var(--primary-color);
      transform: translateX(5px);
    }

    .activity-avatar {
      flex-shrink: 0;
    }

    .avatar-circle {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.9rem;
    }

    .activity-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .activity-text {
      font-size: 1rem;
      color: var(--text-primary);
    }

    .activity-time {
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .activity-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .activity-pagination {
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px dashed rgba(148, 163, 184, 0.5);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      align-items: center;
    }

    .activity-pagination-buttons {
      display: flex;
      gap: 0.75rem;
    }

    .activity-pagination-buttons button {
      min-width: 110px;
      padding: 0.55rem 1.4rem;
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.8);
      background: #f9fafb;
      color: var(--text-primary);
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition);
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
    }

    .activity-pagination-buttons button:hover:not(:disabled) {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
      border-color: transparent;
      transform: translateY(-1px);
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.18);
    }

    .activity-pagination-buttons button:disabled {
      opacity: 0.6;
      cursor: default;
      box-shadow: none;
      transform: none;
      background: #e5e7eb;
    }

    .activity-pagination-info {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    .alerts-content {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .alert-group {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .alert-header {
      display: flex;
      align-items: center;
      gap: 0.8rem;
    }

    .alert-icon {
      font-size: 1.5rem;
    }

    .alert-icon.warning {
      color: var(--warning-color);
    }

    .alert-icon.danger {
      color: var(--error-color);
    }

    .alert-title {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .alert-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .alert-chip {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 600;
      color: white;
    }

    .alert-chip.warning {
      background: var(--warning-color);
    }

    .alert-chip.danger {
      background: var(--error-color);
    }

    /* Actions Section */
    .actions-section {
      margin-bottom: 2rem;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
    }

    .action-btn {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border: 2px solid rgba(102, 126, 234, 0.2);
      border-radius: var(--border-radius);
      padding: 2rem;
      cursor: pointer;
      transition: var(--transition);
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 1.5rem;
      position: relative;
      overflow: hidden;
    }

    .action-btn:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      border-color: var(--primary-color);
      background: rgba(255, 255, 255, 0.98);
    }

    .action-btn.primary:hover {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
    }

    .action-btn.secondary:hover {
      background: linear-gradient(135deg, var(--success-color), #059669);
      color: white;
    }

    .action-btn.tertiary:hover {
      background: linear-gradient(135deg, var(--warning-color), #d97706);
      color: white;
    }

    .action-btn.quaternary:hover {
      background: linear-gradient(135deg, #8b5cf6, #7c3aed);
      color: white;
    }

    .action-icon {
      font-size: 3rem;
      flex-shrink: 0;
    }

    .action-content {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      flex: 1;
    }

    .action-title {
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .action-subtitle {
      font-size: 1rem;
      color: var(--text-secondary);
    }

    .action-btn:hover .action-title,
    .action-btn:hover .action-subtitle {
      color: white;
    }

    /* Responsive */
    @media (max-width: 1200px) {
      .activity-alerts-section {
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

      .header-controls {
        align-items: center;
      }

      .time-filters {
        flex-wrap: wrap;
        justify-content: center;
      }

      .kpi-grid {
        grid-template-columns: 1fr;
      }

      .units-grid {
        grid-template-columns: 1fr;
      }

      .actions-grid {
        grid-template-columns: 1fr;
      }

      .donut-container {
        flex-direction: column;
        gap: 2rem;
      }

      .unit-stats {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 480px) {
      .dashboard-title {
        font-size: 2rem;
      }

      .kpi-card {
        flex-direction: column;
        text-align: center;
      }

      .action-btn {
        flex-direction: column;
        text-align: center;
      }
    }
  `]
})

export class HomeResumenComponent implements OnInit {
  // Rango de fechas
  selectedRange: '7d' | '30d' | '90d' | 'custom' = '7d';
  startDate?: string; // yyyy-mm-dd
  endDate?: string;   // yyyy-mm-dd

  // Métricas clave (se sobrescriben con datos reales)
  kpis: KPI[] = [
    { label: 'Estudiantes activos', value: '0', sub: 'con actividad', icon: 'groups' },
    { label: 'Avance promedio', value: '0%', sub: 'todas las unidades', icon: 'trending_up' },
    { label: 'Tiempo total', value: '0m', sub: 'acumulado', icon: 'schedule' },
    { label: 'Racha promedio', value: '0 días', sub: 'actividad', icon: 'bolt' },
    { label: 'Unidades completadas', value: '0', sub: 'histórico', icon: 'check_circle' },
  ];

  unidades: UnidadResumen[] = [];

  actividad: ActividadItem[] = [];
  activityPage = 1;
  activityPageSize = 5;

  alertas = {
    bajoProgreso: [] as string[],
    inactivos: [] as string[],
  };

  // Distribución de desempeño (para donut)
  distribucion = { alto: 42, medio: 38, bajo: 20 };
  private readonly C = 283; // circunferencia aproximada para r=45

  constructor(
    private analytics: AnalyticsService,
    private gradingV2: GradingV2Service
  ) {}

  ngOnInit(): void {
    this.loadDashboardStats();
    this.loadPerformanceDistribution();
    this.loadUnitsProgress();
    this.loadActivityAndAlerts();
  }

  private loadDashboardStats(): void {
    this.analytics.getDashboardStats().subscribe({
      next: (stats) => {
        this.kpis = [
          { label: 'Estudiantes activos', value: String(stats?.estudiantes_activos ?? 0), sub: 'con actividad', icon: 'groups' },
          { label: 'Avance promedio', value: `${Math.round(stats?.progreso_promedio ?? 0)}%`, sub: 'todas las unidades', icon: 'trending_up' },
          { label: 'Tiempo total', value: this.formatTiempo(stats?.tiempo_total_min), sub: 'acumulado', icon: 'schedule' },
          { label: 'Racha promedio', value: this.formatRacha(stats?.racha_promedio_dias), sub: 'actividad', icon: 'bolt' },
          { label: 'Unidades completadas', value: String(stats?.unidades_completadas_total ?? 0), sub: 'histórico', icon: 'check_circle' },
        ];
      },
      error: (err) => {
        console.error('Error cargando estadísticas del dashboard', err);
      }
    });
  }

  private loadPerformanceDistribution(): void {
    this.gradingV2.getGeneralStatistics().subscribe({
      next: (stats) => {
        const dist = stats?.distribuciones;
        if (!dist) {
          this.distribucion = { alto: 0, medio: 0, bajo: 0 };
          return;
        }

        const altoCount =
          (dist.excelente?.tareas || 0) + (dist.excelente?.quizzes || 0) +
          (dist.bueno?.tareas || 0) + (dist.bueno?.quizzes || 0);

        const medioCount =
          (dist.regular?.tareas || 0) + (dist.regular?.quizzes || 0);

        const bajoCount =
          (dist.deficiente?.tareas || 0) + (dist.deficiente?.quizzes || 0);

        const total = altoCount + medioCount + bajoCount;

        if (total > 0) {
          const altoPct = Math.round((altoCount / total) * 100);
          const medioPct = Math.round((medioCount / total) * 100);
          const bajoPct = Math.max(0, 100 - altoPct - medioPct);
          this.distribucion = { alto: altoPct, medio: medioPct, bajo: bajoPct };
        } else {
          this.distribucion = { alto: 0, medio: 0, bajo: 0 };
        }
      },
      error: (err) => {
        console.error('Error cargando distribución de desempeño', err);
      }
    });
  }

  private loadUnitsProgress(): void {
    this.analytics.getDashboardUnits().subscribe({
      next: (data) => {
        const raw = data?.unidades || [];
        this.unidades = raw.map((u: any) => {
          const baseAvance = u?.avance ?? u?.progreso_porcentaje ?? 0;
          const avance = Math.round(Number.isFinite(baseAvance as number) ? (baseAvance as number) : 0);
          const tendencia = (u?.tendencia as 'up' | 'down' | 'flat') || this.inferTendencia(avance);
          return {
            nombre: u?.nombre || `Unidad ${u?.unidad_id ?? ''}`.trim(),
            avance,
            estudiantes: u?.estudiantes ?? 0,
            tendencia,
          } as UnidadResumen;
        });
      },
      error: (err) => {
        console.error('Error cargando progreso por unidades', err);
      }
    });
  }

  private inferTendencia(avance: number): 'up' | 'down' | 'flat' {
    if (avance >= 70) return 'up';
    if (avance >= 40) return 'flat';
    return 'down';
  }

  private loadActivityAndAlerts(): void {
    this.analytics.getDashboardActivity().subscribe({
      next: (data) => {
        const actividades = data?.actividades || [];
        this.actividad = actividades.map((a: any) => ({
          usuario: a?.nombre || a?.username || 'Estudiante',
          evento: this.buildActivityDescription(a),
          fecha: this.formatRelativeTime(a?.fecha),
        }));
        this.activityPage = 1;

        const rawAlertas = data?.alertas || {};
        this.alertas = {
          bajoProgreso: (rawAlertas.bajo_progreso || []).map((e: any) => e?.nombre || e?.username),
          inactivos: (rawAlertas.inactivos || []).map((e: any) => e?.nombre || e?.username),
        };
      },
      error: (err) => {
        console.error('Error cargando actividad y alertas', err);
      },
    });
  }

  private buildActivityDescription(a: any): string {
    const unidadNombre = a?.unidad_nombre || (a?.unidad_id != null ? `Unidad ${a.unidad_id}` : 'la plataforma');
    const tipo = (a?.tipo_evento || '').toString();
    if (tipo === 'start') return `inició ${unidadNombre}`;
    if (tipo === 'end') return `completó ${unidadNombre}`;
    if (tipo === 'estudio_manual') return `estudió ${unidadNombre}`;
    return `realizó actividad en ${unidadNombre}`;
  }

  setRange(range: '7d' | '30d' | '90d' | 'custom') {
    this.selectedRange = range;
    if (range !== 'custom') {
      this.startDate = undefined;
      this.endDate = undefined;
      // Aquí podríamos refrescar datos según el rango
    }
  }

  private formatTiempo(minutos?: number): string {
    const total = Math.max(0, Math.floor(minutos || 0));
    const horas = Math.floor(total / 60);
    const mins = total % 60;
    if (horas && mins) return `${horas}h ${mins}m`;
    if (horas) return `${horas}h`;
    return `${mins}m`;
  }

  private formatRacha(valor?: number): string {
    const dias = Math.max(0, Math.round(valor || 0));
    return `${dias} día${dias === 1 ? '' : 's'}`;
  }

  private formatRelativeTime(iso?: string): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 1) return 'hace un momento';
    if (diffMin < 60) return `hace ${diffMin} min`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `hace ${diffH} h`;
    const diffD = Math.round(diffH / 24);
    if (diffD === 1) return 'ayer';
    return `hace ${diffD} días`;
  }

  // Porcentajes para el donut
  get totalDistribucion(): number {
    const { alto, medio, bajo } = this.distribucion;
    return alto + medio + bajo;
  }

  get pctAlto(): number { return Math.round((this.distribucion.alto / this.totalDistribucion) * 100); }
  get pctMedio(): number { return Math.round((this.distribucion.medio / this.totalDistribucion) * 100); }
  get pctBajo(): number { return 100 - this.pctAlto - this.pctMedio; }

  // Utilidades SVG donut
  private dash(pct: number): string { return `${Math.max(0, Math.min(100, pct)) / 100 * this.C} ${this.C}`; }
  get altoDash(): string { return this.dash(this.pctAlto); }
  get medioDash(): string { return this.dash(this.pctMedio); }
  get bajoDash(): string { return this.dash(this.pctBajo); }
  get medioOffset(): string { return `${- (this.pctAlto / 100) * this.C}`; }
  get bajoOffset(): string { return `${- ((this.pctAlto + this.pctMedio) / 100) * this.C}`; }

  onDateChange(which: 'start' | 'end', value: string) {
    if (which === 'start') this.startDate = value;
    else this.endDate = value;
    this.selectedRange = 'custom';
  }

  getKpiIcon(icon?: string): string {
    switch (icon) {
      case 'groups': return '👥';
      case 'trending_up': return '📈';
      case 'schedule': return '⏰';
      case 'bolt': return '⚡';
      case 'check_circle': return '✅';
      default: return '📊';
    }
  }

  getProgressColor(progress: number): string {
    if (progress >= 80) return 'linear-gradient(135deg, #10b981, #059669)';
    if (progress >= 60) return 'linear-gradient(135deg, #f59e0b, #d97706)';
    if (progress >= 40) return 'linear-gradient(135deg, #f97316, #ea580c)';
    return 'linear-gradient(135deg, #ef4444, #dc2626)';
  }

  getTrendIcon(tendencia: 'up' | 'down' | 'flat'): string {
    switch (tendencia) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'flat': return '➡️';
      default: return '➡️';
    }
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

  trackByKpi(index: number, kpi: any): any {
    return kpi.label || index;
  }

  trackByUnidad(index: number, unidad: any): any {
    return unidad.nombre || index;
  }

  trackByActivity(index: number, activity: any): any {
    return activity.usuario + activity.evento || index;
  }

  get totalActivityPages(): number {
    if (!this.actividad.length) return 1;
    return Math.ceil(this.actividad.length / this.activityPageSize);
  }

  get actividadPaginada(): ActividadItem[] {
    const start = (this.activityPage - 1) * this.activityPageSize;
    return this.actividad.slice(start, start + this.activityPageSize);
  }

  prevActivityPage(): void {
    if (this.activityPage > 1) {
      this.activityPage--;
    }
  }

  nextActivityPage(): void {
    if (this.activityPage < this.totalActivityPages) {
      this.activityPage++;
    }
  }
}
