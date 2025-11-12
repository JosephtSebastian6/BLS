import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AnalyticsService } from '../../services/analytics.service';
import { EmpresaGruposService } from '../../services/empresa-grupos.service';

@Component({
  selector: 'app-unidad-detalle',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HttpClientModule],
  template: `
  <div class="dashboard-container" [ngClass]="{ profesor: tipoUsuario === 'profesor' }">
    <!-- Header Section -->
    <div class="dashboard-header">
      <div class="header-content">
        <button class="back-btn" (click)="volverAUnidades()" title="Volver a Unidades">
          <span class="btn-icon">←</span>
        </button>
        <div class="title-section">
          <h1 class="dashboard-title">📁 Unidad {{ unidadId }}</h1>
          <p class="dashboard-subtitle">Gestiona las subcarpetas y contenido de la unidad</p>
        </div>
        <div class="header-stats">
          <div class="stat-card">
            <div class="stat-value">{{ subcarpetas.length }}</div>
            <div class="stat-label">📂 Subcarpetas</div>
          </div>
          <div class="stat-card" *ngIf="tipoUsuario === 'estudiante'">
            <div class="stat-value">{{ getVisibleSubcarpetas() }}</div>
            <div class="stat-label">👁️ Visibles</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Subfolder Button -->
    <div *ngIf="tipoUsuario === 'empresa'" class="create-section">
      <div class="create-container">
        <button class="create-btn" (click)="mostrarFormulario = !mostrarFormulario" [disabled]="editandoIdx !== null">
          <span class="btn-icon">{{ mostrarFormulario ? '❌' : '➕' }}</span>
          <span class="btn-text">{{ mostrarFormulario ? 'Cancelar' : 'Crear Subcarpeta' }}</span>
        </button>
      </div>
    </div>

    <!-- Create Subfolder Form -->
    <div *ngIf="mostrarFormulario && tipoUsuario === 'empresa'" class="form-section">
      <div class="form-container">
        <div class="form-header">
          <h3 class="form-title">📝 Nueva Subcarpeta</h3>
          <p class="form-subtitle">Completa la información para crear una nueva subcarpeta</p>
        </div>
        
        <form (ngSubmit)="agregarSubcarpeta()" class="subfolder-form">
          <div class="form-group">
            <label for="nombreSubcarpeta" class="form-label">📂 Nombre de la Subcarpeta</label>
            <input 
              id="nombreSubcarpeta"
              [(ngModel)]="nuevaSubcarpetaNombre" 
              name="nombreSubcarpeta" 
              required 
              class="form-input"
              placeholder="Ej: Ejercicios Prácticos">
          </div>
          
          <div class="form-group">
            <label for="descripcionSubcarpeta" class="form-label">📝 Descripción</label>
            <textarea 
              id="descripcionSubcarpeta"
              [(ngModel)]="nuevaSubcarpetaDescripcion" 
              name="descripcionSubcarpeta" 
              class="form-textarea"
              placeholder="Describe el contenido de la subcarpeta..."
              rows="3"></textarea>
          </div>
          
          <div class="form-actions">
            <button type="submit" [disabled]="!nuevaSubcarpetaNombre.trim()" class="save-btn">
              <span class="btn-icon">💾</span>
              <span class="btn-text">Crear Subcarpeta</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Subfolders Grid -->
    <div class="subfolders-section">
      <div class="section-header">
        <h2 class="section-title">📂 Subcarpetas</h2>
        <div class="section-subtitle">Organiza y gestiona el contenido de la unidad</div>
      </div>

      <div class="subfolders-grid">
        <div 
          *ngFor="let sub of subcarpetas; let i = index; trackBy: trackBySubcarpeta" 
          class="subfolder-card"
          [class.hidden]="tipoUsuario === 'estudiante' && sub.habilitada === false"
          [class.editing]="editandoIdx === i">
          
          <!-- Subfolder Icon -->
          <div class="subfolder-icon" (click)="irADetalleSubcarpeta(i)" [style.cursor]="canNavigate(i) ? 'pointer' : 'not-allowed'">
            <span class="icon-emoji">{{ sub.habilitada === false ? '🔒' : '📁' }}</span>
          </div>
          
          <!-- Subfolder Content (Normal View) -->
          <div *ngIf="editandoIdx !== i" class="subfolder-content">
            <h3 class="subfolder-title" (click)="irADetalleSubcarpeta(i)" [style.cursor]="canNavigate(i) ? 'pointer' : 'not-allowed'">
              {{ sub.nombre }}
            </h3>
            <p class="subfolder-description">{{ sub.descripcion || 'Sin descripción disponible' }}</p>
            
            <!-- Subfolder Status -->
            <div class="subfolder-status">
              <div class="status-badge" [class.visible]="sub.habilitada !== false" [class.hidden-badge]="sub.habilitada === false">
                <span class="status-icon">{{ sub.habilitada === false ? '🔒' : '👁️' }}</span>
                <span class="status-text">{{ sub.habilitada === false ? 'Oculta' : 'Visible' }}</span>
              </div>
            </div>
          </div>
          
          <!-- Subfolder Content (Edit View) -->
          <div *ngIf="editandoIdx === i" class="edit-content">
            <form (ngSubmit)="guardarEdicion()" class="edit-form">
              <div class="form-group">
                <label class="form-label">📂 Nombre</label>
                <input 
                  [(ngModel)]="editNombre" 
                  name="editNombre" 
                  required 
                  class="form-input"
                  placeholder="Nombre de subcarpeta">
              </div>
              
              <div class="form-group">
                <label class="form-label">📝 Descripción</label>
                <textarea 
                  [(ngModel)]="editDescripcion" 
                  name="editDescripcion" 
                  class="form-textarea"
                  placeholder="Descripción (opcional)"
                  rows="2"></textarea>
              </div>
              
              <div class="edit-actions">
                <button type="submit" class="save-edit-btn">
                  <span class="btn-icon">💾</span>
                  <span class="btn-text">Guardar</span>
                </button>
                <button type="button" (click)="cancelarEdicion()" class="cancel-edit-btn">
                  <span class="btn-icon">❌</span>
                  <span class="btn-text">Cancelar</span>
                </button>
              </div>
            </form>
          </div>
          
          <!-- Action Buttons (Empresa only) -->
          <div *ngIf="tipoUsuario === 'empresa' && editandoIdx !== i" class="subfolder-actions">
            <button 
              (click)="iniciarEdicion(i)" 
              class="action-btn edit-btn"
              title="Editar subcarpeta">
              <span class="btn-icon">✏️</span>
            </button>
            
            <button 
              (click)="toggleSubcarpeta(i)" 
              class="action-btn toggle-btn"
              [class.show]="sub.habilitada === false"
              [class.hide]="sub.habilitada !== false"
              [title]="sub.habilitada === false ? 'Mostrar subcarpeta' : 'Ocultar subcarpeta'">
              <span class="btn-icon">{{ sub.habilitada === false ? '👁️' : '🔒' }}</span>
            </button>
            
            <button 
              (click)="eliminarSubcarpeta(i)" 
              class="action-btn delete-btn"
              title="Eliminar subcarpeta">
              <span class="btn-icon">🗑️</span>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Empty State -->
      <div *ngIf="subcarpetas.length === 0" class="empty-state">
        <div class="empty-icon">📂</div>
        <h3 class="empty-title">No hay subcarpetas disponibles</h3>
        <p class="empty-description" *ngIf="tipoUsuario === 'empresa'">
          Crea tu primera subcarpeta para organizar el contenido de esta unidad
        </p>
        <p class="empty-description" *ngIf="tipoUsuario === 'estudiante'">
          No hay subcarpetas habilitadas en esta unidad
        </p>
        <p class="empty-description" *ngIf="tipoUsuario === 'profesor'">
          Esta unidad no tiene subcarpetas asignadas
        </p>
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

    /* Profesor specific styles */
    .dashboard-container.profesor {
      margin: 80px auto 0;
      max-width: 1200px;
    }

    /* Header Section */
    .dashboard-header {
      margin-bottom: 2rem;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      padding: 2rem;
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .back-btn {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
      border: none;
      border-radius: 15px;
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: var(--transition);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
      flex-shrink: 0;
    }

    .back-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
    }

    .back-btn .btn-icon {
      font-size: 1.5rem;
      font-weight: bold;
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

    /* Create Section */
    .create-section {
      margin-bottom: 2rem;
    }

    .create-container {
      display: flex;
      justify-content: center;
    }

    .create-btn {
      background: linear-gradient(135deg, var(--success-color), #059669);
      color: white;
      border: none;
      border-radius: 15px;
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
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
    }

    .create-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
    }

    .create-btn:disabled {
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

    /* Form Section */
    .form-section {
      margin-bottom: 2rem;
    }

    .form-container {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      padding: 2rem;
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(255, 255, 255, 0.2);
      max-width: 600px;
      margin: 0 auto;
    }

    .form-header {
      margin-bottom: 2rem;
      text-align: center;
    }

    .form-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 0.5rem 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .form-subtitle {
      font-size: 1rem;
      color: var(--text-secondary);
      margin: 0;
    }

    .subfolder-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-label {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-primary);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .form-input, .form-textarea {
      padding: 1rem;
      border: 2px solid rgba(102, 126, 234, 0.2);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.9);
      color: var(--text-primary);
      font-size: 1rem;
      transition: var(--transition);
      font-family: inherit;
    }

    .form-input:focus, .form-textarea:focus {
      outline: none;
      border-color: var(--primary-color);
      background: white;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-textarea {
      resize: vertical;
      min-height: 80px;
    }

    .form-actions {
      display: flex;
      justify-content: center;
      margin-top: 1rem;
    }

    .save-btn {
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

    .save-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
    }

    .save-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }

    /* Subfolders Section */
    .subfolders-section {
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

    .subfolders-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 2rem;
      padding: 1rem 0;
    }

    .dashboard-container.profesor .subfolders-grid {
      justify-items: center;
    }

    .subfolder-card {
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
      min-height: 250px;
    }

    .subfolder-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      border-color: var(--primary-color);
      background: rgba(255, 255, 255, 0.98);
    }

    .subfolder-card.hidden {
      opacity: 0.6;
      border-color: var(--text-secondary);
    }

    .subfolder-card.editing {
      border-color: var(--warning-color);
      background: rgba(245, 158, 11, 0.05);
    }

    .subfolder-icon {
      display: flex;
      justify-content: center;
      margin-bottom: 1.5rem;
    }

    .icon-emoji {
      font-size: 3rem;
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
    }

    .subfolder-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }

    .subfolder-title {
      font-size: 1.3rem;
      font-weight: 700;
      color: var(--primary-color);
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-decoration: none;
    }

    .subfolder-title:hover {
      text-decoration: underline;
    }

    .subfolder-description {
      font-size: 1rem;
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.5;
      flex: 1;
    }

    .subfolder-status {
      margin-top: 1rem;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 15px;
      font-size: 0.9rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .status-badge.visible {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success-color);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .status-badge.hidden-badge {
      background: rgba(239, 68, 68, 0.1);
      color: var(--error-color);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .status-icon {
      font-size: 1rem;
    }

    .status-text {
      font-size: 0.8rem;
    }

    /* Edit Content */
    .edit-content {
      flex: 1;
    }

    .edit-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .edit-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      margin-top: 1rem;
    }

    .save-edit-btn {
      background: linear-gradient(135deg, var(--success-color), #059669);
      color: white;
      border: none;
      border-radius: 10px;
      padding: 0.7rem 1.2rem;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition);
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .save-edit-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
    }

    .cancel-edit-btn {
      background: linear-gradient(135deg, var(--text-secondary), #4b5563);
      color: white;
      border: none;
      border-radius: 10px;
      padding: 0.7rem 1.2rem;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition);
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .cancel-edit-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(107, 114, 128, 0.4);
    }

    /* Action Buttons */
    .subfolder-actions {
      position: absolute;
      top: 1rem;
      right: 1rem;
      display: flex;
      gap: 0.5rem;
    }

    .action-btn {
      width: 35px;
      height: 35px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: var(--transition);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
    }

    .edit-btn {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    }

    .edit-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
    }

    .toggle-btn {
      color: white;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }

    .toggle-btn.show {
      background: linear-gradient(135deg, var(--success-color), #059669);
    }

    .toggle-btn.hide {
      background: linear-gradient(135deg, var(--text-secondary), #4b5563);
    }

    .toggle-btn:hover {
      transform: translateY(-2px);
    }

    .delete-btn {
      background: linear-gradient(135deg, var(--error-color), #dc2626);
      color: white;
      box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
    }

    .delete-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4);
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
    @media (max-width: 768px) {
      .dashboard-container {
        padding: 2rem 1rem;
      }

      .dashboard-container.profesor {
        margin: 60px auto 0;
      }

      .header-content {
        flex-direction: column;
        gap: 1.5rem;
        text-align: center;
      }

      .subfolders-grid {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }

      .subfolder-card {
        min-height: auto;
      }

      .action-btn {
        width: 30px;
        height: 30px;
        font-size: 0.8rem;
      }

      .subfolder-actions {
        position: static;
        justify-content: center;
        margin-top: 1rem;
      }
    }

    @media (max-width: 480px) {
      .dashboard-title {
        font-size: 1.8rem;
      }

      .subfolder-title {
        font-size: 1.1rem;
      }

      .subfolder-description {
        font-size: 0.9rem;
      }
    }
  `]
})
export class UnidadDetalleComponent implements OnInit, OnDestroy {
  editandoIdx: number | null = null;
  editNombre: string = '';
  editDescripcion: string = '';
  mostrarFormulario = false;
  nuevaSubcarpetaNombre = '';
  nuevaSubcarpetaDescripcion = '';
  tipoUsuario: string = '';
  agregarSubcarpeta() {
    if (!this.nuevaSubcarpetaNombre.trim() || !this.unidadId) return;
    const idNum = Number(this.unidadId);
    // Estudiante: mantiene local
    if (this.tipoUsuario === 'estudiante') {
      const unidadesGuardadas = localStorage.getItem('unidades');
      if (unidadesGuardadas) {
        const unidades = JSON.parse(unidadesGuardadas);
        const idx = idNum - 1;
        if (unidades[idx]) {
          if (!Array.isArray(unidades[idx].subcarpetas)) {
            unidades[idx].subcarpetas = [];
          }
          unidades[idx].subcarpetas.push({ nombre: this.nuevaSubcarpetaNombre, descripcion: this.nuevaSubcarpetaDescripcion, habilitada: true });
          localStorage.setItem('unidades', JSON.stringify(unidades));
          this.subcarpetas = unidades[idx].subcarpetas;
          this.nuevaSubcarpetaNombre = '';
          this.nuevaSubcarpetaDescripcion = '';
          this.mostrarFormulario = false;
        }
      }
      return;
    }

    // Empresa/Profesor: crear en backend
    const payload = { nombre: this.nuevaSubcarpetaNombre.trim(), descripcion: this.nuevaSubcarpetaDescripcion?.trim() || undefined };
    console.log('[UI] POST backend subcarpeta ->', idNum, payload);
    this.empresaSvc.crearSubcarpeta(idNum, payload).subscribe({
      next: () => {
        this.nuevaSubcarpetaNombre = '';
        this.nuevaSubcarpetaDescripcion = '';
        this.mostrarFormulario = false;
        // refrescar desde backend para ver el cambio y que Android también lo lea
        this.cargarSubcarpetasDesdeBackend();
      },
      error: (e: any) => {
        console.error('[UI] POST subcarpeta ERROR ->', e);
        alert('Error creando subcarpeta: ' + (e?.message || e?.status || 'desconocido'));
      }
    });
  }
  unidadId: string | null = null;
  subcarpetas: Array<{ id?: number; nombre: string; descripcion?: string; archivos?: { name: string }[]; habilitada?: boolean }> = [];

  private heartbeatId: any;
  constructor(private route: ActivatedRoute, private router: Router, private analytics: AnalyticsService, private empresaSvc: EmpresaGruposService) {
    this.unidadId = this.route.snapshot.paramMap.get('id');
    this.cargarSubcarpetas();
    // Detecta tipo de usuario
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.tipoUsuario = user.tipo_usuario || localStorage.getItem('tipo_usuario') || '';
    // Sincroniza desde backend para todos los roles (incluye estudiante)
    if (this.tipoUsuario === 'empresa' || this.tipoUsuario === 'profesor' || this.tipoUsuario === 'estudiante') {
      this.cargarSubcarpetasDesdeBackend();
    }
  }
  irADetalleSubcarpeta(idx: number) {
    if (!this.unidadId) return;
    const sub = idx;
    // Si es estudiante y la subcarpeta está oculta, no permitir navegar
    if (this.tipoUsuario === 'estudiante' && this.subcarpetas[idx] && this.subcarpetas[idx].habilitada === false) {
      return;
    }
    if (this.tipoUsuario === 'estudiante') {
      this.router.navigate([
        '/dashboard-estudiante/unidades',
        this.unidadId,
        'subcarpeta',
        sub
      ]);
    } else if (this.tipoUsuario === 'profesor') {
      this.router.navigate([
        '/dashboard-profesor/unidades',
        this.unidadId,
        'subcarpeta',
        sub
      ], { replaceUrl: false });
    } else {
      this.router.navigate([
        '/dashboard-empresa/unidades',
        this.unidadId,
        'subcarpeta',
        sub
      ]);
    }
  }

  volverAUnidades() {
    if (this.tipoUsuario === 'estudiante') {
      this.router.navigate(['/dashboard-estudiante/unidades']);
    } else if (this.tipoUsuario === 'profesor') {
      this.router.navigate(['/dashboard-profesor/unidades']);
    } else {
      this.router.navigate(['/dashboard-empresa/unidades']);
    }
  }

  ngOnInit() {
    this.cargarArchivosDeLocalStorage();
    // Tracking start + heartbeat
    if (this.unidadId) {
      const idNum = Number(this.unidadId);
      this.analytics.trackingStart(idNum).subscribe({ next: () => {}, error: () => {} });
      this.heartbeatId = setInterval(() => {
        this.analytics.trackingHeartbeat(idNum, 1).subscribe({ next: () => {}, error: () => {} });
      }, 60000);
      window.addEventListener('beforeunload', this._onBeforeUnload);
    }
  }

  ngOnDestroy(): void {
    if (this.heartbeatId) clearInterval(this.heartbeatId);
    window.removeEventListener('beforeunload', this._onBeforeUnload);
    if (this.unidadId) {
      const idNum = Number(this.unidadId);
      this.analytics.trackingEnd(idNum).subscribe({ next: () => {}, error: () => {} });
    }
  }

  private _onBeforeUnload = () => {
    if (this.unidadId) {
      const idNum = Number(this.unidadId);
      this.analytics.trackingEnd(idNum).subscribe({ next: () => {}, error: () => {} });
    }
  };

  cargarArchivosDeLocalStorage() {
    if (!this.unidadId) return;
    this.subcarpetas.forEach((sub, idx) => {
      const key = `unidad_${this.unidadId}_sub_${idx}`;
      const archivosGuardados = localStorage.getItem(key);
      if (archivosGuardados) {
        sub.archivos = JSON.parse(archivosGuardados);
      }
    });
  }

  cargarSubcarpetas() {
    const unidadesGuardadas = localStorage.getItem('unidades');
    if (unidadesGuardadas && this.unidadId) {
      const unidades = JSON.parse(unidadesGuardadas);
      const idx = Number(this.unidadId) - 1;
      if (unidades[idx] && Array.isArray(unidades[idx].subcarpetas)) {
        // Normaliza: filtra nulos y si no existe 'habilitada', se asume true
        const arr: any[] = (unidades[idx].subcarpetas as any[]).filter((s: any) => s && typeof s === 'object');
        this.subcarpetas = arr.map((s: any) => ({
          ...s,
          habilitada: (s && s.habilitada !== undefined) ? s.habilitada : true
        }));
        // guarda normalización
        unidades[idx].subcarpetas = this.subcarpetas;
        localStorage.setItem('unidades', JSON.stringify(unidades));
      } else {
        this.subcarpetas = [];
      }
    } else {
      this.subcarpetas = [];
    }
  }

  // Backend: sobreescribe lista desde la API
  cargarSubcarpetasDesdeBackend() {
    if (!this.unidadId) return;
    const idNum = Number(this.unidadId);
    console.log('[UI] GET backend subcarpetas unidad ->', idNum);
    this.empresaSvc.listarSubcarpetas(idNum).subscribe({
      next: (subs: any[]) => {
        console.log('[UI] GET subcarpetas OK ->', subs);
        const arr = (subs || []).filter((s: any) => s && typeof s === 'object');
        this.subcarpetas = arr.map((s: any) => ({
          id: s.id,
          nombre: s.nombre,
          descripcion: s.descripcion,
          habilitada: (s && s.habilitada !== undefined) ? !!s.habilitada : true
        }));
        // Reflejar en localStorage para compatibilidad
        const unidadesGuardadas = localStorage.getItem('unidades');
        if (unidadesGuardadas) {
          const unidades = JSON.parse(unidadesGuardadas);
          const idx = idNum - 1;
          if (unidades[idx]) {
            unidades[idx].subcarpetas = this.subcarpetas;
            localStorage.setItem('unidades', JSON.stringify(unidades));
          }
        }
      },
      error: (e: any) => {
        console.error('[UI] GET subcarpetas ERROR ->', e);
      }
    });
  }

  eliminarSubcarpeta(idx: number) {
    if (!this.unidadId) return;

    // Para estudiantes: solo local
    if (this.tipoUsuario === 'estudiante') {
      if (!confirm('¿Seguro que deseas eliminar esta subcarpeta?')) return;
      const unidadesGuardadas = localStorage.getItem('unidades');
      if (unidadesGuardadas) {
        const unidades = JSON.parse(unidadesGuardadas);
        const unidadIdx = Number(this.unidadId) - 1;
        if (unidades[unidadIdx] && Array.isArray(unidades[unidadIdx].subcarpetas)) {
          unidades[unidadIdx].subcarpetas.splice(idx, 1);
          localStorage.setItem('unidades', JSON.stringify(unidades));
          this.subcarpetas = unidades[unidadIdx].subcarpetas;
        }
      }
      return;
    }

    // Para empresa/profesor: usar backend
    const subcarpeta = this.subcarpetas[idx];
    if (!subcarpeta || !subcarpeta.id) {
      alert('Error: No se puede eliminar la subcarpeta (ID no encontrado)');
      return;
    }

    if (!confirm('¿Seguro que deseas eliminar esta subcarpeta? Esta acción no se puede deshacer.')) return;

    console.log('[UI] Eliminando subcarpeta:', subcarpeta.id);

    this.empresaSvc.eliminarSubcarpeta(Number(this.unidadId), subcarpeta.id).subscribe({
      next: (res: any) => {
        console.log('[UI] Subcarpeta eliminada correctamente:', res);
        this.cargarSubcarpetasDesdeBackend();
        alert('Subcarpeta eliminada correctamente.');
      },
      error: (error: any) => {
        console.error('[UI] Error eliminando subcarpeta:', error);
        let errorMessage = 'Error eliminando subcarpeta';
        if (error?.status === 403) {
          errorMessage = 'No tienes permisos para eliminar subcarpetas.';
        } else if (error?.status === 404) {
          errorMessage = 'Subcarpeta no encontrada.';
        } else if (error?.status >= 500) {
          errorMessage = 'Error del servidor. Intenta nuevamente más tarde.';
        } else {
          errorMessage = `Error: ${error?.message || error?.status || 'desconocido'}`;
        }
        alert(errorMessage);
      }
    });
  }

  // Alterna la visibilidad (habilitada) de una subcarpeta y la persiste
  toggleSubcarpeta(idx: number) {
    if (!this.unidadId) return;

    // Para estudiantes: solo local
    if (this.tipoUsuario === 'estudiante') {
      const unidadesGuardadas = localStorage.getItem('unidades');
      if (!unidadesGuardadas) return;
      const unidades = JSON.parse(unidadesGuardadas);
      const unidadIdx = Number(this.unidadId) - 1;
      if (!unidades[unidadIdx] || !Array.isArray(unidades[unidadIdx].subcarpetas)) return;
      const sub = unidades[unidadIdx].subcarpetas[idx];
      if (!sub) return;
      const current = sub.habilitada === undefined ? true : !!sub.habilitada;
      sub.habilitada = !current;
      localStorage.setItem('unidades', JSON.stringify(unidades));
      // Refleja en memoria
      this.subcarpetas[idx].habilitada = sub.habilitada;
      return;
    }

    // Para empresa/profesor: usar backend
    const subcarpeta = this.subcarpetas[idx];
    if (!subcarpeta || !subcarpeta.id) {
      alert('Error: No se puede cambiar la visibilidad de la subcarpeta (ID no encontrado)');
      return;
    }

    console.log('[UI] Toggle subcarpeta:', subcarpeta.id);

    this.empresaSvc.toggleSubcarpeta(Number(this.unidadId), subcarpeta.id).subscribe({
      next: (res: any) => {
        console.log('[UI] Subcarpeta toggle correctamente:', res);
        this.cargarSubcarpetasDesdeBackend();
        const estadoTexto = res.habilitada ? 'mostrada' : 'ocultada';
        alert(`Subcarpeta ${estadoTexto} correctamente.`);
      },
      error: (error: any) => {
        console.error('[UI] Error toggle subcarpeta:', error);
        let errorMessage = 'Error cambiando visibilidad de subcarpeta';
        if (error?.status === 403) {
          errorMessage = 'No tienes permisos para cambiar la visibilidad.';
        } else if (error?.status === 404) {
          errorMessage = 'Subcarpeta no encontrada.';
        } else if (error?.status >= 500) {
          errorMessage = 'Error del servidor. Intenta nuevamente más tarde.';
        } else {
          errorMessage = `Error: ${error?.message || error?.status || 'desconocido'}`;
        }
        alert(errorMessage);
      }
    });
  }

  iniciarEdicion(idx: number) {
    this.editandoIdx = idx;
    this.editNombre = this.subcarpetas[idx].nombre;
    this.editDescripcion = this.subcarpetas[idx].descripcion || '';
  }

  cancelarEdicion() {
    this.editandoIdx = null;
    this.editNombre = '';
    this.editDescripcion = '';
  }

  guardarEdicion() {
    if (this.editandoIdx === null || !this.unidadId) return;

    // Para estudiantes: solo local
    if (this.tipoUsuario === 'estudiante') {
      const unidadesGuardadas = localStorage.getItem('unidades');
      if (unidadesGuardadas) {
        const unidades = JSON.parse(unidadesGuardadas);
        const unidadIdx = Number(this.unidadId) - 1;
        if (unidades[unidadIdx] && Array.isArray(unidades[unidadIdx].subcarpetas)) {
          unidades[unidadIdx].subcarpetas[this.editandoIdx] = {
            ...unidades[unidadIdx].subcarpetas[this.editandoIdx],
            nombre: this.editNombre,
            descripcion: this.editDescripcion
          };
          localStorage.setItem('unidades', JSON.stringify(unidades));
          this.subcarpetas = unidades[unidadIdx].subcarpetas;
          this.cancelarEdicion();
        }
      }
      return;
    }

    // Para empresa/profesor: usar backend
    const subcarpeta = this.subcarpetas[this.editandoIdx];
    if (!subcarpeta || !subcarpeta.id) {
      alert('Error: No se puede editar la subcarpeta (ID no encontrado)');
      return;
    }

    const payload = {
      nombre: this.editNombre.trim(),
      descripcion: this.editDescripcion?.trim() || undefined
    };

    console.log('[UI] Editando subcarpeta:', subcarpeta.id, payload);

    this.empresaSvc.editarSubcarpeta(Number(this.unidadId), subcarpeta.id, payload).subscribe({
      next: (res: any) => {
        console.log('[UI] Subcarpeta editada correctamente:', res);
        this.cargarSubcarpetasDesdeBackend();
        this.cancelarEdicion();
        alert('Subcarpeta editada correctamente.');
      },
      error: (error: any) => {
        console.error('[UI] Error editando subcarpeta:', error);
        let errorMessage = 'Error editando subcarpeta';
        if (error?.status === 403) {
          errorMessage = 'No tienes permisos para editar subcarpetas.';
        } else if (error?.status === 404) {
          errorMessage = 'Subcarpeta no encontrada.';
        } else if (error?.status === 400) {
          errorMessage = 'Datos inválidos. Verifica el nombre.';
        } else if (error?.status >= 500) {
          errorMessage = 'Error del servidor. Intenta nuevamente más tarde.';
        } else {
          errorMessage = `Error: ${error?.message || error?.status || 'desconocido'}`;
        }
        alert(errorMessage);
      }
    });
  }

  guardarArchivosEnLocalStorage(idx: number) {
    if (!this.unidadId) return;
    const key = `unidad_${this.unidadId}_sub_${idx}`;
    localStorage.setItem(key, JSON.stringify(this.subcarpetas[idx].archivos));
  }

  onFileSelected(event: any, idx: number) {
    const files = Array.from(event.target.files ?? []);
    // Asegura que el array de archivos exista antes de hacer push
    if (!this.subcarpetas[idx].archivos) {
      this.subcarpetas[idx].archivos = [];
    }
    this.subcarpetas[idx].archivos.push(...files.map((f: any) => ({ name: f.name })));
    this.guardarArchivosEnLocalStorage(idx);
  }

  getVisibleSubcarpetas(): number {
    return this.subcarpetas.filter(sub => sub.habilitada !== false).length;
  }

  canNavigate(idx: number): boolean {
    if (this.tipoUsuario === 'estudiante') {
      return this.subcarpetas[idx]?.habilitada !== false;
    }
    return true;
  }

  trackBySubcarpeta(index: number, subcarpeta: any): any {
    return subcarpeta.id || index;
  }
}
