import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MisProfesService, Profesor } from './mis-profes.service';
import { EmpresaGruposService } from '../services/empresa-grupos.service';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

interface Estudiante {
  identificador: number;
  username: string;
  nombres: string;
  apellidos: string;
  email: string;
  tipo_usuario: string;
}

// Fallback inmediato: 10 unidades de ejemplo
const DEFAULT_UNIDADES: Array<{ id: number; nombre: string }> = [
  { id: 101, nombre: 'Unidad 1 — Introducción' },
  { id: 102, nombre: 'Unidad 2 — Vocabulario básico' },
  { id: 103, nombre: 'Unidad 3 — Gramática I' },
  { id: 104, nombre: 'Unidad 4 — Comprensión lectora' },
  { id: 105, nombre: 'Unidad 5 — Conversación I' },
  { id: 106, nombre: 'Unidad 6 — Gramática II' },
  { id: 107, nombre: 'Unidad 7 — Listening' },
  { id: 108, nombre: 'Unidad 8 — Writing' },
  { id: 109, nombre: 'Unidad 9 — Vocabulario intermedio' },
  { id: 110, nombre: 'Unidad 10 — Proyecto final' }
];

@Component({
  selector: 'app-mis-profes',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
  <div class="dashboard-container">
    <!-- Header Section -->
    <div class="dashboard-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="dashboard-title">👨‍🏫 Mis Profes</h1>
          <p class="dashboard-subtitle">Gestiona profesores, asigna estudiantes y crea grupos de aprendizaje</p>
        </div>
        <button class="btn-primary" (click)="abrirModalGrupo()">
          <span class="btn-icon">➕</span>
          Crear Grupo
        </button>
      </div>
    </div>

    <!-- Toggle Table Button -->
    <div class="toggle-section" *ngIf="profesores?.length">
      <button class="btn-secondary" (click)="toggleTabla()">
        <span class="btn-icon">{{ showTabla ? '👁️‍🗨️' : '📊' }}</span>
        {{ showTabla ? 'Ocultar Tabla' : 'Ver Tabla' }}
      </button>
    </div>

    <!-- Professors Cards -->
    <div class="professors-grid" *ngIf="profesores?.length">
      <div class="professor-card" *ngFor="let profe of profesores">
        <!-- Card Header -->
        <div class="card-header">
          <div class="professor-info">
            <div class="professor-avatar">
              <span class="avatar-text">{{ (profe.nombres || '?')[0] | uppercase }}</span>
            </div>
            <div class="professor-details">
              <h3 class="professor-name">{{ profe.nombres }} {{ profe.apellidos }}</h3>
              <p class="professor-username">@{{ profe.username }}</p>
            </div>
          </div>
        </div>

        <!-- Stats Section -->
        <div class="stats-section">
          <div class="stat-item">
            <div class="stat-value">{{ (resumenMap[profe.username]?.grupos_creados || 0) }}</div>
            <div class="stat-label">📚 Grupos</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-value">{{ (resumenMap[profe.username]?.estudiantes_asignados || 0) }}</div>
            <div class="stat-label">👥 Estudiantes</div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="card-actions">
          <button class="action-btn groups-btn" (click)="toggleVerGrupos(profe)">
            <span class="action-icon">{{ verGruposOpen[profe.username] ? '👁️‍🗨️' : '👀' }}</span>
            {{ verGruposOpen[profe.username] ? 'Ocultar Grupos' : 'Ver Grupos' }}
          </button>
          <button class="action-btn manage-btn" (click)="abrirModalEstudiantes(profe)">
            <span class="action-icon">⚙️</span>
            Gestionar
          </button>
        </div>

        <!-- Groups List -->
        <div class="groups-section" *ngIf="verGruposOpen[profe.username]">
          <div class="groups-header">
            <h4 class="groups-title">📋 Grupos Asignados</h4>
          </div>
          
          <div class="groups-list" *ngIf="(gruposMap[profe.username] || []).length > 0; else noGroups">
            <div class="group-item" *ngFor="let g of (gruposMap[profe.username] || [])">
              <div class="group-header">
                <div class="group-info">
                  <span class="group-unit">{{ g.unidad || g.tema }}</span>
                  <span class="group-id">#{{ g.id }}</span>
                  <span class="group-badge" *ngIf="g.unidad">📚 Unidad</span>
                  <span class="group-badge auto" *ngIf="g.synthetic">🤖 Auto</span>
                </div>
                <button class="delete-group-btn" *ngIf="!g.synthetic" (click)="deleteGrupo(profe, g.id)">
                  <span class="btn-icon">🗑️</span>
                </button>
              </div>
              <div class="students-list">
                <div class="student-item" *ngFor="let est of g.estudiantes">
                  <div class="student-avatar">
                    <span class="avatar-text">{{ (est.nombres || '?')[0] | uppercase }}</span>
                  </div>
                  <div class="student-info">
                    <span class="student-name">{{ est.nombres }} {{ est.apellidos }}</span>
                    <span class="student-username">@{{ est.username }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <ng-template #noGroups>
            <div class="empty-groups">
              <div class="empty-icon">📭</div>
              <p class="empty-text">Sin grupos creados</p>
            </div>
          </ng-template>
        </div>
      </div>
    </div>

    <!-- Table View -->
    <div class="table-container" *ngIf="showTabla && profesores?.length">
      <div class="table-header">
        <h3 class="table-title">📊 Vista de Tabla</h3>
      </div>
      <div class="table-wrapper">
        <table class="professors-table">
          <thead>
            <tr>
              <th>👤 Nombre</th>
              <th>📧 Email</th>
              <th>👥 Estudiantes</th>
              <th>⚙️ Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let profe of profesores">
              <td>
                <div class="table-professor">
                  <div class="table-avatar">
                    <span class="avatar-text">{{ (profe.nombres || '?')[0] | uppercase }}</span>
                  </div>
                  <div class="table-info">
                    <span class="table-name">{{ profe.nombres }} {{ profe.apellidos }}</span>
                    <span class="table-username">@{{ profe.username }}</span>
                  </div>
                </div>
              </td>
              <td>{{ profe.email }}</td>
              <td>
                <span class="student-count">{{ contarEstudiantesAsignados(profe.username) }}</span>
              </td>
              <td>
                <button class="table-action-btn" (click)="abrirModalEstudiantes(profe)">
                  <span class="btn-icon">⚙️</span>
                  Gestionar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty State -->
    <div class="empty-state" *ngIf="!profesores?.length">
      <div class="empty-icon">👨‍🏫</div>
      <h3 class="empty-title">No hay profesores registrados</h3>
      <p class="empty-description">Agrega profesores para comenzar a gestionar grupos y estudiantes</p>
    </div>

    <!-- Modal for Managing Students -->
    <div class="modal-overlay" *ngIf="mostrarModal" (click)="cerrarModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="modal-title-section">
            <h3 class="modal-title">⚙️ Gestionar Estudiantes</h3>
            <p class="modal-subtitle">{{ profesorSeleccionado?.nombres }} {{ profesorSeleccionado?.apellidos }}</p>
          </div>
          <button class="modal-close-btn" (click)="cerrarModal()">
            <span class="close-icon">✕</span>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="students-management" *ngIf="!cargandoEstudiantes; else loadingTemplate">
            <div class="student-management-item" *ngFor="let estudiante of todosEstudiantes">
              <div class="student-card">
                <div class="student-avatar">
                  <span class="avatar-text">{{ (estudiante.nombres || '?')[0] | uppercase }}</span>
                </div>
                <div class="student-details">
                  <span class="student-name">{{ estudiante.nombres }} {{ estudiante.apellidos }}</span>
                  <span class="student-username">@{{ estudiante.username }}</span>
                </div>
              </div>
              <button 
                class="assignment-toggle-btn"
                [class.assigned]="estaAsignado(estudiante.username)"
                [class.unassigned]="!estaAsignado(estudiante.username)"
                (click)="toggleAsignacion(estudiante.username)"
                [disabled]="procesandoAsignacion">
                <span class="toggle-icon">{{ estaAsignado(estudiante.username) ? '➖' : '➕' }}</span>
                {{ estaAsignado(estudiante.username) ? 'Desasignar' : 'Asignar' }}
              </button>
            </div>
          </div>
          
          <ng-template #loadingTemplate>
            <div class="loading-state">
              <div class="loading-spinner">⏳</div>
              <p class="loading-text">Cargando estudiantes...</p>
            </div>
          </ng-template>
        </div>
      </div>
    </div>

    <!-- Modal for Creating Groups -->
    <div class="modal-overlay" *ngIf="mostrarModalGrupo" (click)="cerrarModalGrupo()">
      <div class="modal-content large" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="modal-title-section">
            <h3 class="modal-title">➕ Crear Grupo</h3>
            <p class="modal-subtitle">Configura un nuevo grupo de aprendizaje</p>
          </div>
          <button class="modal-close-btn" (click)="cerrarModalGrupo()">
            <span class="close-icon">✕</span>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="form-section">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">
                  <span class="label-text">👨‍🏫 Profesor</span>
                  <select [(ngModel)]="formGrupo.profesor_username" class="form-select">
                    <option *ngFor="let p of profesores" [value]="p.username">
                      {{ p.nombres }} {{ p.apellidos }} (@{{p.username}})
                    </option>
                  </select>
                </label>
              </div>
              <div class="form-group">
                <label class="form-label">
                  <span class="label-text">📚 Unidad</span>
                  <select [(ngModel)]="formGrupo.unidad_id" (ngModelChange)="onUnidadChange($event)" class="form-select">
                    <ng-container *ngIf="(unidadesOrDefault?.length || 0) > 0; else fallbackUnits">
                      <option *ngFor="let u of unidadesOrDefault" [value]="u.id">{{ u.nombre }}</option>
                    </ng-container>
                    <ng-template #fallbackUnits>
                      <option [value]="101">Unidad 1 — Introducción</option>
                      <option [value]="102">Unidad 2 — Vocabulario básico</option>
                      <option [value]="103">Unidad 3 — Gramática I</option>
                      <option [value]="104">Unidad 4 — Comprensión lectora</option>
                      <option [value]="105">Unidad 5 — Conversación I</option>
                    </ng-template>
                  </select>
                </label>
              </div>
            </div>

            <div class="filter-option">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="soloEstudiantesDeUnidad" (ngModelChange)="onFiltroChange($event)" class="checkbox-input" />
                <span class="checkbox-text">🎯 Mostrar solo estudiantes de la unidad seleccionada</span>
              </label>
            </div>

            <div class="students-selection">
              <h4 class="selection-title">👥 Selecciona Estudiantes</h4>
              <div class="students-selection-list">
                <label class="student-selection-item" *ngFor="let est of estudiantesParaCrearGrupo">
                  <input 
                    type="checkbox" 
                    [checked]="formGrupo.estudiantes.includes(est.username)" 
                    (change)="toggleSeleccionEstudiante(est.username)"
                    class="selection-checkbox"
                  />
                  <div class="selection-student-info">
                    <div class="selection-avatar">
                      <span class="avatar-text">{{ (est.nombres || '?')[0] | uppercase }}</span>
                    </div>
                    <div class="selection-details">
                      <span class="selection-name">{{ est.nombres }} {{ est.apellidos }}</span>
                      <span class="selection-username">@{{ est.username }}</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn-secondary" (click)="cerrarModalGrupo()">
            <span class="btn-icon">❌</span>
            Cancelar
          </button>
          <button class="btn-primary" [disabled]="creandoGrupo" (click)="crearGrupo()">
            <span class="btn-icon">{{ creandoGrupo ? '⏳' : '✨' }}</span>
            {{ creandoGrupo ? 'Creando...' : 'Crear Grupo' }}
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

    .btn-secondary {
      background: rgba(255, 255, 255, 0.9);
      color: var(--text-primary);
      border: 2px solid rgba(102, 126, 234, 0.2);
      border-radius: 12px;
      padding: 0.8rem 1.2rem;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .btn-secondary:hover {
      background: var(--primary-color);
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
    }

    .btn-icon {
      font-size: 1.2rem;
    }

    /* Toggle Section */
    .toggle-section {
      margin-bottom: 2rem;
      display: flex;
      justify-content: center;
    }

    /* Professors Grid */
    .professors-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 2rem;
      margin-bottom: 2rem;
    }

    .professor-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      padding: 1.5rem;
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: var(--transition);
    }

    .professor-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 50px rgba(0, 0, 0, 0.15);
    }

    .card-header {
      margin-bottom: 1.5rem;
    }

    .professor-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .professor-avatar {
      width: 60px;
      height: 60px;
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
      font-size: 1.5rem;
    }

    .professor-details {
      flex: 1;
    }

    .professor-name {
      font-size: 1.3rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 0.3rem 0;
    }

    .professor-username {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin: 0;
    }

    /* Stats Section */
    .stats-section {
      display: flex;
      align-items: center;
      justify-content: space-around;
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: rgba(248, 250, 252, 0.8);
      border-radius: 15px;
      border: 1px solid rgba(226, 232, 240, 0.5);
    }

    .stat-item {
      text-align: center;
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

    .stat-divider {
      width: 2px;
      height: 40px;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      border-radius: 1px;
    }

    /* Card Actions */
    .card-actions {
      display: flex;
      gap: 0.8rem;
      justify-content: space-between;
    }

    .action-btn {
      flex: 1;
      padding: 0.8rem 1rem;
      border: none;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .groups-btn {
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
      border: 1px solid rgba(59, 130, 246, 0.2);
    }

    .groups-btn:hover {
      background: #3b82f6;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
    }

    .manage-btn {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success-color);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .manage-btn:hover {
      background: var(--success-color);
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
    }

    .action-icon {
      font-size: 1rem;
    }

    /* Groups Section */
    .groups-section {
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px dashed rgba(226, 232, 240, 0.7);
    }

    .groups-header {
      margin-bottom: 1rem;
    }

    .groups-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }

    .groups-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .group-item {
      background: rgba(248, 250, 252, 0.8);
      border-radius: 12px;
      padding: 1rem;
      border: 1px solid rgba(226, 232, 240, 0.5);
      transition: var(--transition);
    }

    .group-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    }

    .group-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .group-info {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      flex-wrap: wrap;
    }

    .group-unit {
      font-weight: 700;
      color: var(--text-primary);
      font-size: 1rem;
    }

    .group-id {
      background: rgba(102, 126, 234, 0.1);
      color: var(--primary-color);
      padding: 0.3rem 0.8rem;
      border-radius: 15px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .group-badge {
      padding: 0.3rem 0.8rem;
      border-radius: 15px;
      font-size: 0.8rem;
      font-weight: 600;
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
    }

    .group-badge.auto {
      background: rgba(245, 158, 11, 0.1);
      color: var(--warning-color);
    }

    .delete-group-btn {
      background: rgba(239, 68, 68, 0.1);
      color: var(--error-color);
      border: none;
      border-radius: 8px;
      padding: 0.5rem;
      cursor: pointer;
      transition: var(--transition);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .delete-group-btn:hover {
      background: var(--error-color);
      color: white;
      transform: translateY(-2px);
    }

    /* Students List */
    .students-list {
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
    }

    .student-item {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      padding: 0.8rem;
      background: white;
      border-radius: 10px;
      border: 1px solid rgba(226, 232, 240, 0.3);
    }

    .student-avatar {
      width: 35px;
      height: 35px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--success-color), #059669);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
    }

    .student-info {
      flex: 1;
    }

    .student-name {
      display: block;
      font-weight: 600;
      color: var(--text-primary);
      font-size: 0.9rem;
    }

    .student-username {
      display: block;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    /* Empty Groups */
    .empty-groups {
      text-align: center;
      padding: 2rem;
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .empty-text {
      color: var(--text-secondary);
      font-style: italic;
    }

    /* Table Container */
    .table-container {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      padding: 1.5rem;
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(255, 255, 255, 0.2);
      margin-bottom: 2rem;
    }

    .table-header {
      margin-bottom: 1.5rem;
    }

    .table-title {
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    .professors-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      background: white;
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    }

    .professors-table th {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
      padding: 1rem;
      text-align: left;
      font-weight: 700;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .professors-table td {
      padding: 1rem;
      border-bottom: 1px solid rgba(226, 232, 240, 0.5);
    }

    .professors-table tbody tr:hover {
      background: rgba(102, 126, 234, 0.05);
    }

    .table-professor {
      display: flex;
      align-items: center;
      gap: 0.8rem;
    }

    .table-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
    }

    .table-info {
      display: flex;
      flex-direction: column;
    }

    .table-name {
      font-weight: 600;
      color: var(--text-primary);
    }

    .table-username {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .student-count {
      background: rgba(102, 126, 234, 0.1);
      color: var(--primary-color);
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-weight: 600;
      display: inline-block;
    }

    .table-action-btn {
      background: var(--success-color);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 0.6rem 1rem;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .table-action-btn:hover {
      background: #059669;
      transform: translateY(-2px);
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

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      backdrop-filter: blur(5px);
    }

    .modal-content {
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .modal-content.large {
      max-width: 800px;
    }

    .modal-header {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
      padding: 1.5rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-title-section {
      flex: 1;
    }

    .modal-title {
      font-size: 1.3rem;
      font-weight: 700;
      margin: 0 0 0.3rem 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .modal-subtitle {
      font-size: 0.9rem;
      margin: 0;
      opacity: 0.9;
    }

    .modal-close-btn {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 8px;
      transition: var(--transition);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-close-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .close-icon {
      font-size: 1.5rem;
    }

    .modal-body {
      padding: 2rem;
      max-height: 60vh;
      overflow-y: auto;
    }

    .modal-footer {
      padding: 1.5rem 2rem;
      border-top: 1px solid rgba(226, 232, 240, 0.5);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    /* Students Management */
    .students-management {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .student-management-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: rgba(248, 250, 252, 0.8);
      border-radius: 12px;
      border: 1px solid rgba(226, 232, 240, 0.5);
    }

    .student-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex: 1;
    }

    .student-details {
      display: flex;
      flex-direction: column;
    }

    .assignment-toggle-btn {
      padding: 0.6rem 1.2rem;
      border: none;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .assignment-toggle-btn.assigned {
      background: rgba(239, 68, 68, 0.1);
      color: var(--error-color);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .assignment-toggle-btn.assigned:hover {
      background: var(--error-color);
      color: white;
      transform: translateY(-2px);
    }

    .assignment-toggle-btn.unassigned {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success-color);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .assignment-toggle-btn.unassigned:hover {
      background: var(--success-color);
      color: white;
      transform: translateY(-2px);
    }

    .assignment-toggle-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .toggle-icon {
      font-size: 1rem;
    }

    /* Loading State */
    .loading-state {
      text-align: center;
      padding: 3rem;
    }

    .loading-spinner {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .loading-text {
      color: var(--text-secondary);
      font-style: italic;
    }

    /* Form Section */
    .form-section {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-label {
      display: block;
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

    .form-select {
      padding: 1rem;
      border: 2px solid rgba(102, 126, 234, 0.1);
      border-radius: 12px;
      font-size: 1rem;
      background: white;
      color: var(--text-primary);
      cursor: pointer;
      transition: var(--transition);
    }

    .form-select:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    /* Filter Option */
    .filter-option {
      padding: 1rem;
      background: rgba(248, 250, 252, 0.8);
      border-radius: 12px;
      border: 1px solid rgba(226, 232, 240, 0.5);
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      cursor: pointer;
    }

    .checkbox-input {
      width: auto;
      margin: 0;
    }

    .checkbox-text {
      font-weight: 600;
      color: var(--text-primary);
    }

    /* Students Selection */
    .students-selection {
      background: rgba(248, 250, 252, 0.8);
      border-radius: 12px;
      padding: 1.5rem;
      border: 1px solid rgba(226, 232, 240, 0.5);
    }

    .selection-title {
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 1rem 0;
    }

    .students-selection-list {
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
      max-height: 300px;
      overflow-y: auto;
    }

    .student-selection-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: white;
      border-radius: 10px;
      border: 1px solid rgba(226, 232, 240, 0.3);
      cursor: pointer;
      transition: var(--transition);
    }

    .student-selection-item:hover {
      background: rgba(102, 126, 234, 0.05);
      border-color: rgba(102, 126, 234, 0.2);
    }

    .selection-checkbox {
      width: auto;
      margin: 0;
    }

    .selection-student-info {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      flex: 1;
    }

    .selection-avatar {
      width: 35px;
      height: 35px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
    }

    .selection-details {
      display: flex;
      flex-direction: column;
    }

    .selection-name {
      font-weight: 600;
      color: var(--text-primary);
      font-size: 0.9rem;
    }

    .selection-username {
      font-size: 0.8rem;
      color: var(--text-secondary);
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

      .professors-grid {
        grid-template-columns: 1fr;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .card-actions {
        flex-direction: column;
      }

      .modal-content {
        width: 95%;
        margin: 1rem;
      }

      .modal-footer {
        flex-direction: column;
        gap: 1rem;
      }

      .modal-footer .btn-primary,
      .modal-footer .btn-secondary {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class MisProfesComponent implements OnInit {
  profesores: Profesor[] = [];
  resumenMap: Record<string, { grupos_creados: number; grupos_estimados?: number; estudiantes_asignados: number }> = {};
  todosEstudiantes: Estudiante[] = [];
  estudiantesAsignados: Estudiante[] = [];
  estudiantesFiltradosPorUnidad: Estudiante[] = [];
  profesorSeleccionado: Profesor | null = null;
  mostrarModal = false;
  // Crear grupo
  mostrarModalGrupo = false;
  creandoGrupo = false;
  formGrupo = {
    profesor_username: '',
    unidad_id: null as number | null,
    estudiantes: [] as string[]
  };
  soloEstudiantesDeUnidad = false; // filtro opcional en modal crear grupo
  unidades: Array<{ id: number; nombre: string }> = DEFAULT_UNIDADES.slice();
  cargandoProfesores = false;
  cargandoUnidades = false;
  cargandoEstudiantes = false;
  procesandoAsignacion = false;
  showTabla = false;
  private apiUrl = 'http://localhost:8000/auth';
  gruposMap: Record<string, any[] | null> = {};
  verGruposOpen: Record<string, boolean> = {};
  // Exponer fallback al template
  defaultUnidades = DEFAULT_UNIDADES;
  get unidadesOrDefault(): Array<{ id: number; nombre: string }> {
    return (this.unidades && this.unidades.length) ? this.unidades : this.defaultUnidades;
  }

  constructor(
    private misProfesService: MisProfesService,
    private http: HttpClient,
    private gruposSvc: EmpresaGruposService
  ) {}

  ngOnInit(): void {
    this.cargandoProfesores = true;
    this.cargarProfesores();
    this.cargarTodosEstudiantes();
    this.cargandoUnidades = true;
    this.gruposSvc.listarUnidades().subscribe({
      next: (u) => {
        this.unidades = (u && u.length) ? u : DEFAULT_UNIDADES.slice();
        this.cargandoUnidades = false;
      },
      error: (e) => {
        console.error('Error cargando unidades', e);
        this.unidades = DEFAULT_UNIDADES.slice();
        this.cargandoUnidades = false;
      }
    });
  }

  // ===== Crear Grupo =====
  abrirModalGrupo(): void {
    // setear por defecto primer profesor si existe
    if (this.profesores.length && !this.formGrupo.profesor_username) {
      this.formGrupo.profesor_username = this.profesores[0].username;
    }
    // Si no hay profesores o unidades aún, volver a cargarlos
    if (!this.profesores.length && !this.cargandoProfesores) {
      this.cargandoProfesores = true;
      this.cargarProfesores();
      this.cargandoProfesores = false;
    }
    if (!this.unidades.length && !this.cargandoUnidades) {
      this.cargandoUnidades = true;
      this.gruposSvc.listarUnidades().subscribe({
        next: (u) => { this.unidades = (u && u.length) ? u : DEFAULT_UNIDADES.slice(); this.cargandoUnidades = false; this.formGrupo.unidad_id = this.unidades?.[0]?.id ?? null; },
        error: () => { this.unidades = DEFAULT_UNIDADES.slice(); this.cargandoUnidades = false; }
      });
    }
    // Asegurar que los estudiantes estén cargados
    if (!this.todosEstudiantes.length) {
      console.log('Cargando estudiantes para el modal...');
      this.cargarTodosEstudiantes();
    }
    // Asegurar datos inmediatos en el selector y una opción preseleccionada
    if (!this.unidades?.length) {
      this.unidades = DEFAULT_UNIDADES.slice();
    }
    this.formGrupo.estudiantes = [];
    this.formGrupo.unidad_id = this.unidades?.[0]?.id ?? 101;
    this.mostrarModalGrupo = true;
  }

  // sampleUnidades() ya no es necesario; usamos DEFAULT_UNIDADES

  cerrarModalGrupo(): void {
    this.mostrarModalGrupo = false;
  }

  toggleSeleccionEstudiante(username: string): void {
    const idx = this.formGrupo.estudiantes.indexOf(username);
    if (idx >= 0) this.formGrupo.estudiantes.splice(idx, 1);
    else this.formGrupo.estudiantes.push(username);
  }

  onUnidadChange(nuevaUnidadId: any): void {
    // Actualizar el id de unidad asegurando que sea numérico
    this.formGrupo.unidad_id = nuevaUnidadId != null ? Number(nuevaUnidadId) : null;
    // Limpiar estudiantes seleccionados al cambiar unidad
    this.formGrupo.estudiantes = [];
    // Filtrar estudiantes si está activado el filtro
    if (this.soloEstudiantesDeUnidad && this.formGrupo.unidad_id) {
      this.filtrarEstudiantesPorUnidad();
    }
  }

  onFiltroChange(nuevoValor: boolean): void {
    // Actualizar el valor del filtro con el valor real del checkbox
    this.soloEstudiantesDeUnidad = nuevoValor;
    // Filtrar estudiantes cuando se activa/desactiva el filtro
    if (nuevoValor && this.formGrupo.unidad_id) {
      this.filtrarEstudiantesPorUnidad();
    } else {
      this.estudiantesFiltradosPorUnidad = [];
    }
    // Limpiar selección al cambiar filtro
    this.formGrupo.estudiantes = [];
  }

  // Lista de estudiantes filtrada por unidad seleccionada en el modal (si la opción está activa)
  get estudiantesParaCrearGrupo(): Estudiante[] {
    if (!this.soloEstudiantesDeUnidad || !this.formGrupo.unidad_id) {
      return this.todosEstudiantes;
    }
    
    // Filtrar estudiantes que tienen la unidad habilitada
    return this.estudiantesFiltradosPorUnidad;
  }

  crearGrupo(): void {
    if (!this.formGrupo.profesor_username || !this.formGrupo.unidad_id) {
      alert('Selecciona profesor y unidad');
      return;
    }
    
    if (this.formGrupo.estudiantes.length === 0) {
      alert('Debes seleccionar al menos un estudiante para crear el grupo');
      return;
    }
    
    if (this.formGrupo.estudiantes.length > 10) {
      alert('No puedes seleccionar más de 10 estudiantes por grupo');
      return;
    }
    
    this.creandoGrupo = true;
    // Consumir endpoint simplificado de grupos por unidad
    this.gruposSvc.crearGrupoUnidad({
      profesor_username: this.formGrupo.profesor_username,
      unidad_id: this.formGrupo.unidad_id!,
      estudiantes: this.formGrupo.estudiantes,
    }).subscribe({
      next: (response) => {
        this.creandoGrupo = false;
        this.mostrarModalGrupo = false;
        
        const totalEstudiantes = response?.estudiantes?.length || this.formGrupo.estudiantes.length;
        const mensaje = totalEstudiantes === 1 
          ? `Grupo creado con ${totalEstudiantes} estudiante`
          : `Grupo creado con ${totalEstudiantes} estudiantes`;
        
        alert(mensaje);
        this.cargarResumenes();
        
        // Limpiar formulario
        this.formGrupo.estudiantes = [];
      },
      error: (e) => {
        console.error('Error creando grupo:', e);
        this.creandoGrupo = false;
        
        // Manejar errores específicos del backend
        let mensaje = 'No se pudo crear el grupo';
        if (e?.error?.detail) {
          mensaje = e.error.detail;
        } else if (e?.status === 400) {
          mensaje = 'Error: Límite de estudiantes excedido o grupo ya completo';
        }
        
        alert(mensaje);
      }
    });
  }

  cargarProfesores(): void {
    this.misProfesService.getProfesores().subscribe((data) => {
      this.profesores = data;
      this.cargarResumenes();
    });
  }

  private cargarResumenes() {
    (this.profesores || []).forEach(p => {
      this.misProfesService.getResumenAsignaciones(p.username).subscribe({
        next: (r) => { this.resumenMap[p.username] = r as any; },
        error: () => { this.resumenMap[p.username] = { grupos_creados: 0, estudiantes_asignados: 0 } as any; }
      });
    });
  }

  cargarTodosEstudiantes(): void {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get<Estudiante[]>(`${this.apiUrl}/estudiantes`, { headers })
      .subscribe({
        next: (estudiantes) => {
          this.todosEstudiantes = estudiantes;
          console.log('Estudiantes cargados:', estudiantes.length);
          // Filtrar por unidad si está activado el filtro
          if (this.soloEstudiantesDeUnidad && this.formGrupo.unidad_id) {
            this.filtrarEstudiantesPorUnidad();
          }
        },
        error: (error) => {
          console.error('Error cargando estudiantes:', error);
          this.todosEstudiantes = [];
          this.estudiantesFiltradosPorUnidad = [];
        }
      });
  }

  filtrarEstudiantesPorUnidad(): void {
    if (!this.formGrupo.unidad_id || !this.todosEstudiantes.length) {
      this.estudiantesFiltradosPorUnidad = [];
      return;
    }

    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    
    // Obtener estado de unidades para cada estudiante
    const requests = this.todosEstudiantes.map(estudiante =>
      this.http.get<any[]>(`${this.apiUrl}/estudiantes/${encodeURIComponent(estudiante.username)}/unidades/estado`, { headers })
        .pipe(
          map(unidades => ({
            estudiante,
            tieneUnidadHabilitada: unidades.some(u => Number(u.id) === Number(this.formGrupo.unidad_id) && u.habilitada)
          })),
          catchError(() => of({ estudiante, tieneUnidadHabilitada: false }))
        )
    );

    forkJoin(requests).subscribe({
      next: (resultados) => {
        this.estudiantesFiltradosPorUnidad = resultados
          .filter(r => r.tieneUnidadHabilitada)
          .map(r => r.estudiante);
        console.log(`Estudiantes con unidad ${this.formGrupo.unidad_id} habilitada:`, this.estudiantesFiltradosPorUnidad.length);
      },
      error: (error) => {
        console.error('Error filtrando estudiantes por unidad:', error);
        this.estudiantesFiltradosPorUnidad = [];
      }
    });
  }

  abrirModalEstudiantes(profesor: Profesor): void {
    this.profesorSeleccionado = profesor;
    this.mostrarModal = true;
    this.cargarEstudiantesAsignados();
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.profesorSeleccionado = null;
    this.estudiantesAsignados = [];
  }

  cargarEstudiantesAsignados(): void {
    if (!this.profesorSeleccionado) return;
    
    this.cargandoEstudiantes = true;
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get<Estudiante[]>(`${this.apiUrl}/profesores/${this.profesorSeleccionado.username}/estudiantes`, { headers })
      .subscribe({
        next: (estudiantes) => {
          this.estudiantesAsignados = estudiantes;
          this.cargandoEstudiantes = false;
        },
        error: (error) => {
          console.error('Error cargando estudiantes asignados:', error);
          this.cargandoEstudiantes = false;
        }
      });
  }

  estaAsignado(estudianteUsername: string): boolean {
    return this.estudiantesAsignados.some(est => est.username === estudianteUsername);
  }

  contarEstudiantesAsignados(profesorUsername: string): number {
    return this.resumenMap[profesorUsername]?.estudiantes_asignados ?? 0;
  }

  toggleTabla(): void {
    this.showTabla = !this.showTabla;
  }

  toggleAsignacion(estudianteUsername: string): void {
    if (!this.profesorSeleccionado || this.procesandoAsignacion) return;
    
    this.procesandoAsignacion = true;
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    const estaAsignadoActualmente = this.estaAsignado(estudianteUsername);
    const url = `${this.apiUrl}/profesores/${this.profesorSeleccionado.username}/estudiantes/${estudianteUsername}`;
    
    const request = estaAsignadoActualmente 
      ? this.http.delete(url, { headers })
      : this.http.post(url, {}, { headers });

    request.subscribe({
      next: () => {
        console.log(`Estudiante ${estaAsignadoActualmente ? 'desasignado' : 'asignado'} correctamente`);
        this.cargarEstudiantesAsignados(); // Recargar lista
        this.procesandoAsignacion = false;
      },
      error: (error) => {
        console.error('Error en asignación:', error);
        this.procesandoAsignacion = false;
      }
    });
  }

  // Cargar/alternar grupos por profesor (basado en estudiantes asignados, no clases)
  toggleVerGrupos(profesor: Profesor): void {
    const key = profesor.username;
    const isOpen = !!this.verGruposOpen[key];
    if (!isOpen) {
      // Cargar por primera vez desde grupos de empresa (asociados a estudiantes)
      this.gruposSvc.listarGruposPorProfesor(key).subscribe({
        next: (grupos: any[]) => {
          let mapped = (grupos || []).map((g: any) => {
            // Intentar normalizar distintas formas de unidad/nombre
            const unidadNombre = g?.unidad?.nombre || g?.unidad_nombre || g?.unidad || '';
            const estudiantesRaw = g?.estudiantes || g?.miembros || g?.members || [];
            const estudiantes = (Array.isArray(estudiantesRaw) ? estudiantesRaw : []).map((e: any) => {
              if (typeof e === 'string') return { username: e };
              return {
                username: e?.username || e?.correo || e?.email || '',
                nombres: e?.nombres || e?.first_name || '',
                apellidos: e?.apellidos || e?.last_name || ''
              };
            });
            return {
              id: g?.id || g?.grupo_id || g?.clase_id,
              tema: g?.tema || g?.nombre || '',
              unidad: unidadNombre,
              estudiantes,
              synthetic: false
            };
          });
          // Fallback: si no hay grupos en API, construir grupos por unidad a partir de estudiantes asignados
          if (!mapped.length) {
            this.construirGruposDesdeAsignaciones(key).subscribe((synth: any[]) => {
              this.gruposMap[key] = synth as any[];
              this.verGruposOpen[key] = true;
            });
          } else {
            this.gruposMap[key] = mapped;
            this.verGruposOpen[key] = true;
          }
        },
        error: (e) => {
          console.error('Error cargando grupos', e);
          // En error de API, también intentar fallback por asignaciones
          this.construirGruposDesdeAsignaciones(key).subscribe((synth: any[]) => {
            this.gruposMap[key] = synth as any[];
            this.verGruposOpen[key] = true;
          });
        }
      });
    } else {
      // Solo alternar visibilidad sin recarga
      this.verGruposOpen[key] = false;
    }
  }

  // Fallback: agrupar por unidad según las unidades habilitadas de cada estudiante asignado
  private construirGruposDesdeAsignaciones(profUsername: string): Observable<any[]> {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    // 1) Obtener estudiantes asignados
    return this.http.get<Estudiante[]>(`${this.apiUrl}/profesores/${profUsername}/estudiantes`, { headers }).pipe(
      catchError(() => of([])),
      switchMap((asignados: Estudiante[]) => {
        if (!asignados.length) return of([] as any[]);
        // 2) Por cada estudiante, traer sus unidades habilitadas
        const reqs = asignados.map(est =>
          this.http.get<any[]>(`${this.apiUrl}/estudiantes/${encodeURIComponent(est.username)}/unidades/estado`, { headers })
            .pipe(catchError(() => of([])))
            .pipe(map(unidades => ({ est, unidades })))
        );
        return forkJoin(reqs).pipe(
          map((rows) => {
            const groupsByUnidad: Record<string, { id: string; tema: string; unidad: string; estudiantes: any[]; synthetic: boolean }> = {};
            rows.forEach(({ est, unidades }) => {
              (unidades || []).filter((u: any) => u?.habilitada).forEach((u: any) => {
                const uname = u?.nombre || `Unidad ${u?.id}`;
                const gid = `unit-${u?.id}`;
                if (!groupsByUnidad[uname]) {
                  groupsByUnidad[uname] = { id: gid, tema: '', unidad: uname, estudiantes: [], synthetic: true };
                }
                groupsByUnidad[uname].estudiantes.push({ username: est.username, nombres: est.nombres, apellidos: est.apellidos });
              });
            });
            return Object.values(groupsByUnidad);
          })
        );
      })
    );
  }

  // Eliminar grupo con confirmación (tabla de grupos de empresa)
  deleteGrupo(profesor: Profesor, grupoId: number): void {
    if (!grupoId) return;
    const ok = confirm('¿Eliminar este grupo? Esta acción no se puede deshacer.');
    if (!ok) return;
    this.gruposSvc.deleteGrupo(grupoId).subscribe({
      next: () => {
        const key = profesor.username;
        // Quitar del mapa local
        if (Array.isArray(this.gruposMap[key])) {
          this.gruposMap[key] = (this.gruposMap[key] || []).filter((g: any) => g.id !== grupoId);
        }
        // Refrescar resumen para actualizar grupos_creados
        this.misProfesService.getResumenAsignaciones(key).subscribe({
          next: (r) => { this.resumenMap[key] = r as any; },
          error: () => {}
        });
      },
      error: (e) => {
        console.error('Error eliminando grupo', e);
        alert(e?.error?.detail || 'No se pudo eliminar el grupo');
      }
    });
  }
}
