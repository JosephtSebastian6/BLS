import { Component, OnInit } from '@angular/core';
// ...existing code...




import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { DashboardLayoutComponent } from '../dashboard-layout/dashboard-layout.component';
import { HttpClient } from '@angular/common/http';
import { addDays, startOfMonth, endOfMonth, getDay, format } from 'date-fns';


export interface ClaseEstudiante {
  nombre: string;
  profesor: string;
  horario: string;
  activa: boolean;
  meet_link: string;
}

@Component({
  selector: 'app-dashboard-mis-clases-estudiante',
  standalone: true,
  imports: [CommonModule, RouterModule, DashboardLayoutComponent],
  template: `
  <app-dashboard-layout>
    <div class="dashboard-container">
      <!-- Simple Header -->
      <div class="simple-header">
        <h1 class="page-title">📅 Mis Clases</h1>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <div class="loading-text">Cargando calendario de clases...</div>
      </div>

      <!-- Error State -->
      <div *ngIf="error && !loading" class="error-container">
        <div class="error-icon">⚠️</div>
        <div class="error-text">{{ error }}</div>
        <button class="retry-btn" (click)="ngOnInit()">
          <span class="retry-icon">🔄</span>
          Reintentar
        </button>
      </div>

      <!-- Calendar Content -->
      <div *ngIf="!loading && !error && calendar && calendar.length" class="calendar-section">
        <!-- Calendar Navigation -->
        <div class="calendar-navigation">
          <button class="nav-btn prev" (click)="prevMonth()">
            <span class="nav-icon">←</span>
            <span class="nav-text">Anterior</span>
          </button>
          
          <div class="month-display">
            <h2 class="month-title">{{ monthName | titlecase }}</h2>
            <div class="month-subtitle">{{ currentYear }}</div>
          </div>
          
          <button class="nav-btn next" (click)="nextMonth()">
            <span class="nav-text">Siguiente</span>
            <span class="nav-icon">→</span>
          </button>
        </div>

        <!-- Calendar Grid -->
        <div class="calendar-container">
          <div class="calendar-grid">
            <!-- Days Header -->
            <div class="calendar-header">
              <div 
                *ngFor="let dia of diasSemana; trackBy: trackByDia" 
                class="day-header">
                {{ dia.nombre }}
              </div>
            </div>

            <!-- Calendar Days -->
            <div class="calendar-body">
              <div 
                *ngFor="let semana of calendar; trackBy: trackBySemana" 
                class="calendar-week">
                
                <div 
                  *ngFor="let dia of semana; trackBy: trackByDia" 
                  class="calendar-day-container"
                  [class.selected]="selectedDay && dia.date && dia.date.getTime() === selectedDay.getTime()"
                  [class.today]="isToday(dia.date)"
                  [class.has-classes]="dia.clases && dia.clases.length > 0"
                  [class.empty-day]="!dia.date">
                  
                  <!-- Day Button -->
                  <button 
                    class="calendar-day-btn"
                    [class.selected]="selectedDay && dia.date && dia.date.getTime() === selectedDay.getTime()"
                    [class.today]="isToday(dia.date)"
                    [class.has-classes]="dia.clases && dia.clases.length > 0"
                    [class.inactive]="!dia.date"
                    (click)="dia.clases && dia.clases.length ? openClasesModal(dia) : onDayClick(dia.date)"
                    [disabled]="!dia.date">
                    
                    <span *ngIf="dia.date" class="day-number">{{ dia.date.getDate() }}</span>
                    
                    <!-- Classes Indicator -->
                    <div *ngIf="dia.clases && dia.clases.length > 0" class="classes-indicator">
                      <div class="class-dot" *ngFor="let clase of dia.clases.slice(0, 3)"></div>
                      <div *ngIf="dia.clases.length > 3" class="more-classes">+{{ dia.clases.length - 3 }}</div>
                    </div>
                  </button>

                  <!-- Classes Preview -->
                  <div *ngIf="dia.clases && dia.clases.length > 0" class="classes-preview">
                    <div 
                      *ngFor="let clase of dia.clases.slice(0, 2); trackBy: trackByClase" 
                      class="class-preview-item"
                      [title]="clase.nombre + ' - ' + clase.profesor">
                      <div class="class-name">{{ clase.nombre }}</div>
                      <div class="class-time">{{ getTimeFromHorario(clase.horario) }}</div>
                    </div>
                    <div *ngIf="dia.clases.length > 2" class="more-classes-text">
                      +{{ dia.clases.length - 2 }} más
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Selected Day Info -->
        <div *ngIf="selectedDay && clasesDelDiaSeleccionado().length > 0" class="selected-day-info">
          <div class="selected-day-header">
            <h3 class="selected-day-title">
              📅 Clases del {{ formatearFechaEspanol(selectedDay) }}
            </h3>
            <button class="close-selection-btn" (click)="selectedDay = null">✕</button>
          </div>
          
          <div class="selected-day-classes">
            <div 
              *ngFor="let clase of clasesDelDiaSeleccionado(); trackBy: trackByClase" 
              class="selected-class-card">
              
              <div class="class-header">
                <div class="class-title">{{ clase.nombre }}</div>
                <div class="class-status" [class.active]="clase.activa" [class.inactive]="!clase.activa">
                  {{ clase.activa ? '✅ Activa' : '⏸️ Inactiva' }}
                </div>
              </div>
              
              <div class="class-details">
                <div class="class-detail">
                  <span class="detail-icon">👨‍🏫</span>
                  <span class="detail-label">Profesor:</span>
                  <span class="detail-value">{{ clase.profesor }}</span>
                </div>
                
                <div class="class-detail">
                  <span class="detail-icon">⏰</span>
                  <span class="detail-label">Horario:</span>
                  <span class="detail-value">{{ clase.horario }}</span>
                </div>
                
                <div *ngIf="clase.meet_link" class="class-detail">
                  <span class="detail-icon">🔗</span>
                  <span class="detail-label">Enlace:</span>
                  <a [href]="clase.meet_link" target="_blank" rel="noopener" class="meet-link">
                    Unirse a la clase
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Classes State -->
      <div *ngIf="!loading && !error && (!calendar || calendar.length === 0)" class="empty-state">
        <div class="empty-icon">📅</div>
        <div class="empty-title">No hay clases programadas</div>
        <div class="empty-subtitle">No tienes clases asignadas actualmente</div>
        <button class="refresh-btn" (click)="ngOnInit()">
          <span class="refresh-icon">🔄</span>
          Actualizar
        </button>
      </div>

      <!-- Classes Modal -->
      <div *ngIf="modalDia" class="modal-overlay" (click)="closeClasesModal()">
        <div class="modal-container" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">
              📅 Clases del {{ formatearFechaEspanol(modalDia.date) }}
            </h3>
            <button class="modal-close-btn" (click)="closeClasesModal()">✕</button>
          </div>
          
          <div class="modal-content">
            <div 
              *ngFor="let clase of modalDia.clases; trackBy: trackByClase" 
              class="modal-class-card">
              
              <div class="modal-class-header">
                <div class="modal-class-title">{{ clase.nombre }}</div>
                <div class="modal-class-status" [class.active]="clase.activa" [class.inactive]="!clase.activa">
                  {{ clase.activa ? '✅' : '⏸️' }}
                </div>
              </div>
              
              <div class="modal-class-details">
                <div class="modal-class-detail">
                  <span class="modal-detail-icon">👨‍🏫</span>
                  <span class="modal-detail-text">{{ clase.profesor }}</span>
                </div>
                
                <div class="modal-class-detail">
                  <span class="modal-detail-icon">⏰</span>
                  <span class="modal-detail-text">{{ clase.horario }}</span>
                </div>
                
                <div *ngIf="clase.meet_link" class="modal-class-detail">
                  <a [href]="clase.meet_link" target="_blank" rel="noopener" class="modal-meet-link">
                    <span class="modal-detail-icon">🔗</span>
                    <span class="modal-detail-text">Unirse a la clase</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </app-dashboard-layout>
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
      padding: 1rem;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Simple Header */
    .simple-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .page-title {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--primary-color);
      margin: 0;
      text-transform: uppercase;
      letter-spacing: -0.02em;
      text-shadow: 0 2px 10px rgba(102, 126, 234, 0.2);
    }

    /* Loading State */
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      gap: 1.5rem;
    }

    .loading-spinner {
      width: 60px;
      height: 60px;
      border: 4px solid rgba(102, 126, 234, 0.2);
      border-top: 4px solid var(--primary-color);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .loading-text {
      font-size: 1.2rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    /* Error State */
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      gap: 1.5rem;
      text-align: center;
    }

    .error-icon {
      font-size: 4rem;
    }

    .error-text {
      font-size: 1.2rem;
      color: var(--error-color);
      font-weight: 600;
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
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .retry-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
    }

    .retry-icon {
      font-size: 1.2rem;
    }

    /* Calendar Section */
    .calendar-section {
      margin-bottom: 2rem;
    }

    .calendar-navigation {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
      max-width: 1600px;
      margin-left: auto;
      margin-right: auto;
    }

    .nav-btn {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 0.6rem 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-weight: 500;
      color: #374151;
      font-size: 0.9rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .nav-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border-color: #6366f1;
      background: #f9fafb;
    }

    .nav-icon {
      font-size: 1.2rem;
      color: var(--primary-color);
    }

    .month-display {
      text-align: center;
    }

    .month-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary-color);
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .month-subtitle {
      font-size: 0.9rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    /* Calendar Grid */
    .calendar-container {
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      border: 1px solid #e5e7eb;
      padding: 2.5rem;
      overflow: hidden;
      max-width: 1600px;
      margin: 0 auto;
    }

    .calendar-grid {
      width: 100%;
    }

    .calendar-header {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      border-bottom: 1px solid #e5e7eb;
      margin-bottom: 0;
    }

    .day-header {
      text-align: center;
      font-weight: 600;
      color: #6b7280;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 0.75rem;
      border-right: 1px solid #e5e7eb;
      background: #f9fafb;
    }

    .day-header:last-child {
      border-right: none;
    }

    .calendar-body {
      display: grid;
      grid-template-rows: repeat(6, 1fr);
      border: 1px solid #e5e7eb;
      border-top: none;
    }

    .calendar-week {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      border-bottom: 1px solid #e5e7eb;
    }

    .calendar-week:last-child {
      border-bottom: none;
    }

    .calendar-day-container {
      position: relative;
      min-height: 120px;
      border-right: 1px solid #e5e7eb;
      display: flex;
      flex-direction: column;
      background: #ffffff;
    }

    .calendar-day-container:last-child {
      border-right: none;
    }

    .calendar-day-btn {
      width: 100%;
      height: 100%;
      border: none;
      border-radius: 0;
      background: transparent;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: flex-start;
      position: relative;
      font-weight: 500;
      color: #374151;
      padding: 0.5rem;
    }

    .calendar-day-btn:hover {
      background: #f3f4f6;
    }

    .calendar-day-container.today {
      background: #dbeafe;
    }

    .calendar-day-container.selected {
      background: #e0e7ff;
    }

    .calendar-day-container.has-classes {
      background: #f0fdf4;
    }

    .calendar-day-container.empty-day {
      background: #f9fafb;
    }

    .calendar-day-btn.inactive {
      opacity: 0.4;
      cursor: not-allowed;
      background: transparent;
    }

    .day-number {
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
      color: #374151;
    }

    .calendar-day-container.today .day-number {
      color: #1d4ed8;
      font-weight: 700;
    }

    .classes-indicator {
      display: none;
    }

    .class-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
    }

    .more-classes {
      font-size: 0.7rem;
      color: #10b981;
      font-weight: 600;
      margin-left: 2px;
    }

    .classes-preview {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      flex: 1;
    }

    .class-preview-item {
      background: #10b981;
      color: white;
      border-radius: 3px;
      padding: 0.2rem 0.4rem;
      font-size: 0.7rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
    }

    .class-preview-item:hover {
      background: #059669;
      transform: scale(1.02);
    }

    .class-name {
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .class-time {
      font-size: 0.8rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .more-classes-text {
      font-size: 0.6rem;
      color: var(--text-secondary);
      text-align: center;
      font-weight: 600;
      padding: 0.1rem;
    }

    /* Selected Day Info */
    .selected-day-info {
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      border: 1px solid #e5e7eb;
      padding: 2rem;
      margin-top: 2rem;
      max-width: 1600px;
      margin-left: auto;
      margin-right: auto;
    }

    .selected-day-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid rgba(102, 126, 234, 0.1);
    }

    .selected-day-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary-color);
      margin: 0;
    }

    .close-selection-btn {
      background: rgba(239, 68, 68, 0.1);
      border: 2px solid rgba(239, 68, 68, 0.2);
      border-radius: 50%;
      width: 40px;
      height: 40px;
      cursor: pointer;
      transition: var(--transition);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      color: var(--error-color);
      font-weight: 700;
    }

    .close-selection-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(239, 68, 68, 0.2);
      background: rgba(239, 68, 68, 0.2);
    }

    .selected-day-classes {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .selected-class-card {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(10px);
      border: 2px solid rgba(102, 126, 234, 0.2);
      border-radius: 15px;
      padding: 1.5rem;
      transition: var(--transition);
    }

    .selected-class-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.2);
      border-color: var(--primary-color);
    }

    .class-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .class-title {
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .class-status {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 600;
    }

    .class-status.active {
      background: rgba(16, 185, 129, 0.2);
      color: var(--success-color);
    }

    .class-status.inactive {
      background: rgba(107, 114, 128, 0.2);
      color: var(--text-secondary);
    }

    .class-details {
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
    }

    .class-detail {
      display: flex;
      align-items: center;
      gap: 0.8rem;
    }

    .detail-icon {
      font-size: 1.2rem;
      flex-shrink: 0;
    }

    .detail-label {
      font-weight: 600;
      color: var(--text-secondary);
      min-width: 80px;
    }

    .detail-value {
      color: var(--text-primary);
      font-weight: 500;
    }

    .meet-link {
      color: var(--primary-color);
      text-decoration: none;
      font-weight: 600;
      transition: var(--transition);
    }

    .meet-link:hover {
      color: var(--secondary-color);
      text-decoration: underline;
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      gap: 1.5rem;
      text-align: center;
    }

    .empty-icon {
      font-size: 4rem;
      opacity: 0.6;
    }

    .empty-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .empty-subtitle {
      font-size: 1.1rem;
      color: var(--text-secondary);
    }

    .refresh-btn {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
      border: none;
      border-radius: 12px;
      padding: 1rem 2rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .refresh-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
    }

    .refresh-icon {
      font-size: 1.2rem;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(5px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-container {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      border: 2px solid rgba(102, 126, 234, 0.2);
      max-width: 90vw;
      max-height: 90vh;
      overflow: hidden;
      animation: slideIn 0.3s ease;
      position: relative;
    }

    @keyframes slideIn {
      from { 
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
      }
      to { 
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2rem 2rem 1rem 2rem;
      border-bottom: 2px solid rgba(102, 126, 234, 0.1);
    }

    .modal-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary-color);
      margin: 0;
    }

    .modal-close-btn {
      background: rgba(239, 68, 68, 0.1);
      border: 2px solid rgba(239, 68, 68, 0.2);
      border-radius: 50%;
      width: 40px;
      height: 40px;
      cursor: pointer;
      transition: var(--transition);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      color: var(--error-color);
      font-weight: 700;
    }

    .modal-close-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(239, 68, 68, 0.2);
      background: rgba(239, 68, 68, 0.2);
    }

    .modal-content {
      padding: 1rem 2rem 2rem 2rem;
      max-height: 60vh;
      overflow-y: auto;
    }

    .modal-class-card {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(10px);
      border: 2px solid rgba(102, 126, 234, 0.2);
      border-radius: 15px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      transition: var(--transition);
    }

    .modal-class-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.2);
      border-color: var(--primary-color);
    }

    .modal-class-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .modal-class-title {
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .modal-class-status {
      font-size: 1.5rem;
    }

    .modal-class-status.active {
      color: var(--success-color);
    }

    .modal-class-status.inactive {
      color: var(--text-secondary);
    }

    .modal-class-details {
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
    }

    .modal-class-detail {
      display: flex;
      align-items: center;
      gap: 0.8rem;
    }

    .modal-detail-icon {
      font-size: 1.2rem;
      flex-shrink: 0;
    }

    .modal-detail-text {
      color: var(--text-primary);
      font-weight: 500;
    }

    .modal-meet-link {
      color: var(--primary-color);
      text-decoration: none;
      font-weight: 600;
      transition: var(--transition);
      display: flex;
      align-items: center;
      gap: 0.8rem;
    }

    .modal-meet-link:hover {
      color: var(--secondary-color);
      text-decoration: underline;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .header-content {
        flex-direction: column;
        gap: 1.5rem;
        text-align: center;
      }

      .header-stats {
        justify-content: center;
      }

      .calendar-navigation {
        flex-direction: column;
        gap: 1rem;
      }

      .nav-btn {
        width: 100%;
        justify-content: center;
      }
    }

    @media (max-width: 768px) {
      .dashboard-container {
        padding: 1rem 0.5rem;
      }

      .calendar-day-container {
        min-height: 100px;
      }

      .day-number {
        font-size: 0.8rem;
      }

      .classes-preview {
        display: none;
      }

      .calendar-container {
        padding: 1rem;
      }

      .day-header {
        padding: 0.5rem;
        font-size: 0.7rem;
      }
    }

    @media (max-width: 480px) {
      .page-title {
        font-size: 2rem;
      }

      .day-header {
        font-size: 0.6rem;
        padding: 0.3rem;
      }

      .day-number {
        font-size: 0.7rem;
      }

      .calendar-day-container {
        min-height: 80px;
      }

      .modal-container {
        margin: 0.5rem;
        max-width: calc(100vw - 1rem);
      }

      .calendar-container {
        padding: 0.5rem;
      }

      .calendar-day-btn {
        padding: 0.3rem;
      }
    }
  `]
})
export class DashboardMisClasesEstudianteComponent implements OnInit {
  clases: ClaseEstudiante[] = [];
  loading = true;
  error = '';

  get clasesActivas(): number {
    return this.clases.filter(clase => clase.activa).length;
  }

  diasSemana = [
    { nombre: 'Lunes', valor: 'lunes' },
    { nombre: 'Martes', valor: 'martes' },
    { nombre: 'Miércoles', valor: 'miercoles' },
    { nombre: 'Jueves', valor: 'jueves' },
    { nombre: 'Viernes', valor: 'viernes' },
    { nombre: 'Sábado', valor: 'sabado' },
    { nombre: 'Domingo', valor: 'domingo' }
  ];

  menuItems = [
    { label: 'Mi Perfil', route: '/dashboard-estudiante', icon: 'person' },
    { label: 'Mis Cursos', route: '/dashboard-mis-cursos', icon: 'menu_book' },
    { label: 'Mis Clases', route: '/dashboard-mis-clases-estudiante', icon: 'class' },
    { label: 'Certificados', route: '', icon: 'verified', disabled: true }
  ];

  get activeRoute(): string {
    return this.router.url;
  }

  currentDate = new Date();
  currentMonth = this.currentDate.getMonth();
  currentYear = this.currentDate.getFullYear();
  calendar: { date: Date, clases: ClaseEstudiante[] }[][] = [];

  selectedDay: Date | null = null;
  modalDia: { date: Date, clases: ClaseEstudiante[] } | null = null;

  // Para navegación de meses
  get monthName(): string {
    return this.currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  }

  prevMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.currentDate = new Date(this.currentYear, this.currentMonth, 1);
    this.generarCalendario();
  }

  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.currentDate = new Date(this.currentYear, this.currentMonth, 1);
    this.generarCalendario();
  }

  constructor(private http: HttpClient, public router: Router) {}

  ngOnInit() {
    const username = localStorage.getItem('username');
    this.loading = true;
    this.http.get<any[]>(`http://localhost:8000/auth/clases-estudiante/${username}`)
      .subscribe({
        next: (data) => {
          this.clases = data.map(clase => ({
            nombre: clase.tema,
            profesor: clase.profesor_nombres && clase.profesor_apellidos
              ? `${clase.profesor_nombres} ${clase.profesor_apellidos}`
              : (clase.profesor_username || ''),
            horario: `${clase.dia} ${clase.hora}`,
            activa: clase.activa !== false,
            meet_link: clase.meet_link || ''
          }));
          this.generarCalendario();
          this.loading = false;
        },
        error: () => {
          this.error = 'No se pudieron cargar las clases.';
          this.loading = false;
        }
      });
  }

  // Genera la matriz de semanas para el mes actual
  public generarCalendario() {
    const primerDiaMes = startOfMonth(new Date(this.currentYear, this.currentMonth));
    const ultimoDiaMes = endOfMonth(primerDiaMes);
    const semanas: { date: Date, clases: ClaseEstudiante[] }[][] = [];
    let semana: { date: Date, clases: ClaseEstudiante[] }[] = [];
    let dia = primerDiaMes;
    // Ajusta para que la semana inicie en lunes
    let offset = (getDay(dia) + 6) % 7;
    for (let i = 0; i < offset; i++) {
      semana.push({ date: null as any, clases: [] });
    }
    while (dia <= ultimoDiaMes) {
      const clasesDelDia = this.clases.filter(clase => {
        // Si el horario es tipo fecha, compara con el día
        const fechaClase = clase.horario.split(' ')[0];
        return format(dia, 'yyyy-MM-dd') === fechaClase;
      });
      semana.push({ date: new Date(dia), clases: clasesDelDia });
      if (semana.length === 7) {
        semanas.push(semana);
        semana = [];
      }
      dia = addDays(dia, 1);
    }
    if (semana.length > 0) {
      while (semana.length < 7) semana.push({ date: null as any, clases: [] });
      semanas.push(semana);
    }
    this.calendar = semanas;
    // Si el día seleccionado no está en el mes actual, lo deselecciona
    if (this.selectedDay && (this.selectedDay.getMonth() !== this.currentMonth || this.selectedDay.getFullYear() !== this.currentYear)) {
      this.selectedDay = null;
    }
  }

  onDayClick(date: Date | null) {
    if (!date) return;
    if (this.selectedDay && date.getTime() === this.selectedDay.getTime()) {
      this.selectedDay = null; // deselecciona si ya está seleccionado
    } else {
      this.selectedDay = date;
    }
  }

  openClasesModal(dia: { date: Date, clases: ClaseEstudiante[] }) {
    if (dia && dia.date && dia.clases && dia.clases.length) {
      this.modalDia = dia;
    }
  }

  closeClasesModal() {
    this.modalDia = null;
  }

  isToday(date: Date | null): boolean {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  isActive(path: string): boolean {
    return this.router.url === path;
  }

  // Utilidad para extraer el día de la clase (asume que clase.horario inicia con el día en español)
  getDiaClase(clase: ClaseEstudiante): string {
    // Ejemplo: "Lunes 10:00" o "2025-08-22 14:10" (si es fecha, puedes parsear a día)
    // Si tienes el día como string, extrae la palabra
    const partes = clase.horario.split(' ');
    const dia = partes[0].toLowerCase();
    // Normaliza tildes
    return dia
      .replace('á', 'a')
      .replace('é', 'e')
      .replace('í', 'i')
      .replace('ó', 'o')
      .replace('ú', 'u');
  }

  // Devuelve las clases del día seleccionado
  clasesDelDiaSeleccionado(): ClaseEstudiante[] {
    if (!this.selectedDay) return [];
    for (const semana of this.calendar) {
      for (const dia of semana) {
        if (dia.date && this.selectedDay && dia.date.getTime() === this.selectedDay.getTime()) {
          return dia.clases;
        }
      }
    }
    return [];
  }

  getTimeFromHorario(horario: string): string {
    // Extrae la hora del horario (ej: "Lunes 10:00-11:00" -> "10:00-11:00")
    const timeMatch = horario.match(/(\d{1,2}:\d{2}(?:-\d{1,2}:\d{2})?)/);
    return timeMatch ? timeMatch[1] : horario;
  }

  trackByDia(index: number, dia: any): any {
    return dia.date ? dia.date.getTime() : index;
  }

  trackBySemana(index: number, semana: any): any {
    return index;
  }

  trackByClase(index: number, clase: ClaseEstudiante): any {
    return clase.nombre + clase.profesor || index;
  }

  // Formatear fecha completamente en español
  formatearFechaEspanol(date: Date): string {
    const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];

    const diaSemana = diasSemana[date.getDay()];
    const dia = date.getDate();
    const mes = meses[date.getMonth()];
    const año = date.getFullYear();

    return `${diaSemana}, ${dia} de ${mes} de ${año}`;
  }
}
