  import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { EmpresaGruposService } from '../services/empresa-grupos.service';
import { AnalyticsService } from '../services/analytics.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-unidades',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
  <div class="dashboard-container" [ngClass]="{ profesor: tipoUsuario === 'profesor' }">
    <!-- Header Section -->
    <div class="dashboard-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="dashboard-title">📚 Unidades</h1>
          <p class="dashboard-subtitle">Gestiona y organiza las unidades de aprendizaje</p>
        </div>
        <div class="header-stats">
          <div class="stat-card">
            <div class="stat-value">{{ unidades.length }}</div>
            <div class="stat-label">📚 Unidades</div>
          </div>
          <div class="stat-card" *ngIf="tipoUsuario === 'estudiante'">
            <div class="stat-value">{{ privadas_entregadas.size }}</div>
            <div class="stat-label">✅ Entregadas</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Unit Button -->
    <div *ngIf="tipoUsuario === 'empresa'" class="create-section">
      <div class="create-container">
        <button class="create-btn" (click)="mostrarFormulario = true" [disabled]="mostrarFormulario">
          <span class="btn-icon">➕</span>
          <span class="btn-text">Crear Nueva Unidad</span>
        </button>
      </div>
    </div>

    <!-- Create Unit Form -->
    <div *ngIf="mostrarFormulario && tipoUsuario === 'empresa'" class="form-section">
      <div class="form-container">
        <div class="form-header">
          <h3 class="form-title">📝 Nueva Unidad</h3>
          <p class="form-subtitle">Completa la información para crear una nueva unidad</p>
        </div>
        
        <form (ngSubmit)="guardarUnidad()" class="unit-form">
          <div class="form-group">
            <label for="nombre" class="form-label">📚 Nombre de la Unidad</label>
            <input 
              id="nombre" 
              [(ngModel)]="nuevaUnidad.nombre" 
              name="nombre" 
              required 
              class="form-input"
              placeholder="Ej: Introducción a Angular"
              [disabled]="creando">
          </div>
          
          <div class="form-group">
            <label for="descripcion" class="form-label">📝 Descripción</label>
            <textarea 
              id="descripcion" 
              [(ngModel)]="nuevaUnidad.descripcion" 
              name="descripcion" 
              class="form-textarea"
              placeholder="Describe el contenido y objetivos de la unidad..."
              rows="3"
              [disabled]="creando"></textarea>
          </div>
          
          <div class="form-actions">
            <button type="submit" [disabled]="creando || !nuevaUnidad.nombre.trim()" class="save-btn">
              <span class="btn-icon">{{ creando ? '⏳' : '💾' }}</span>
              <span class="btn-text">{{ creando ? 'Creando...' : 'Guardar Unidad' }}</span>
            </button>
            <button type="button" (click)="cancelarUnidad()" [disabled]="creando" class="cancel-btn">
              <span class="btn-icon">❌</span>
              <span class="btn-text">Cancelar</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Units Grid -->
    <div class="units-section">
      <div class="units-grid">
        <div 
          *ngFor="let unidad of unidades; let i = index; trackBy: trackByUnidad" 
          class="unit-card"
          [class.delivered]="tipoUsuario === 'estudiante' && privadas_entregadas.has(unidad.id!)"
          (click)="irADetalleUnidad(unidad)">
          
          <!-- Unit Icon -->
          <div class="unit-icon">
            <span class="icon-emoji">📁</span>
          </div>
          
          <!-- Unit Content -->
          <div class="unit-content">
            <h3 class="unit-title">{{ unidad.nombre }}</h3>
            <p class="unit-description">{{ unidad.descripcion || 'Sin descripción disponible' }}</p>
            
            <!-- Unit Stats -->
            <div class="unit-stats">
              <div class="stat-item">
                <span class="stat-icon">📂</span>
                <span class="stat-text">{{ (unidad.subcarpetasCount ?? unidad.subcarpetas.length) }} subcarpetas</span>
              </div>
              <div class="stat-item" *ngIf="tipoUsuario === 'estudiante' && privadas_entregadas.has(unidad.id!)">
                <span class="stat-icon">✅</span>
                <span class="stat-text">Entregada</span>
              </div>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="unit-actions" (click)="$event.stopPropagation()">
            <!-- Delete Button (Empresa) -->
            <button 
              *ngIf="tipoUsuario === 'empresa'" 
              (click)="eliminarUnidad(i, $event)" 
              class="action-btn delete-btn"
              title="Eliminar unidad">
              <span class="btn-icon">🗑️</span>
            </button>
            
            <!-- Deliver Button (Estudiante) -->
            <button 
              *ngIf="tipoUsuario === 'estudiante'"
              (click)="entregarUnidad(i, $event)"
              [disabled]="privadas_entregadas.has(unidad.id!)"
              class="action-btn deliver-btn"
              [class.delivered]="privadas_entregadas.has(unidad.id!)"
              [title]="privadas_entregadas.has(unidad.id!) ? 'Unidad ya entregada' : 'Entregar unidad'">
              <span class="btn-icon">{{ privadas_entregadas.has(unidad.id!) ? '✅' : '📤' }}</span>
              <span class="btn-text">{{ privadas_entregadas.has(unidad.id!) ? 'Entregada' : 'Entregar' }}</span>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Empty State -->
      <div *ngIf="unidades.length === 0" class="empty-state">
        <div class="empty-icon">📚</div>
        <h3 class="empty-title">No hay unidades disponibles</h3>
        <p class="empty-description" *ngIf="tipoUsuario === 'empresa'">
          Crea tu primera unidad para comenzar a organizar el contenido
        </p>
        <p class="empty-description" *ngIf="tipoUsuario === 'estudiante'">
          No tienes unidades habilitadas en este momento
        </p>
        <p class="empty-description" *ngIf="tipoUsuario === 'profesor'">
          No hay unidades asignadas para gestionar
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

    .unit-form {
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

    .form-input:disabled, .form-textarea:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .form-textarea {
      resize: vertical;
      min-height: 80px;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
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

    .cancel-btn {
      background: linear-gradient(135deg, var(--error-color), #dc2626);
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

    .cancel-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4);
    }

    .cancel-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }

    /* Units Section */
    .units-section {
      margin-bottom: 2rem;
    }

    .units-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 2rem;
      padding: 1rem 0;
    }

    .dashboard-container.profesor .units-grid {
      justify-items: center;
    }

    .unit-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      box-shadow: var(--card-shadow);
      border: 2px solid rgba(102, 126, 234, 0.2);
      padding: 2rem;
      cursor: pointer;
      transition: var(--transition);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-height: 200px;
    }

    .unit-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      border-color: var(--primary-color);
      background: rgba(255, 255, 255, 0.98);
    }

    .unit-card.delivered {
      border-color: var(--success-color);
      background: rgba(16, 185, 129, 0.05);
    }

    .unit-card.delivered:hover {
      border-color: var(--success-color);
      background: rgba(16, 185, 129, 0.1);
    }

    .unit-icon {
      display: flex;
      justify-content: center;
      margin-bottom: 1.5rem;
    }

    .icon-emoji {
      font-size: 3rem;
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
    }

    .unit-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .unit-title {
      font-size: 1.3rem;
      font-weight: 700;
      color: var(--primary-color);
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: center;
    }

    .unit-description {
      font-size: 1rem;
      color: var(--text-secondary);
      margin: 0;
      text-align: center;
      line-height: 1.5;
      flex: 1;
    }

    .unit-stats {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 1rem;
    }

    .stat-item {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: rgba(102, 126, 234, 0.1);
      border: 1px solid rgba(102, 126, 234, 0.2);
      border-radius: 15px;
    }

    .stat-icon {
      font-size: 1rem;
    }

    .stat-text {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--primary-color);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .unit-actions {
      position: absolute;
      top: 1rem;
      right: 1rem;
      display: flex;
      gap: 0.5rem;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: var(--transition);
      font-weight: 600;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.3px;
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

    .deliver-btn {
      background: linear-gradient(135deg, var(--success-color), #059669);
      color: white;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
    }

    .deliver-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
    }

    .deliver-btn.delivered {
      background: linear-gradient(135deg, #6b7280, #4b5563);
      box-shadow: 0 4px 15px rgba(107, 114, 128, 0.3);
      cursor: default;
    }

    .deliver-btn:disabled {
      opacity: 0.8;
      cursor: not-allowed;
      transform: none;
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

      .units-grid {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }

      .unit-card {
        min-height: auto;
      }

      .form-actions {
        flex-direction: column;
        align-items: stretch;
      }

      .action-btn {
        font-size: 0.7rem;
        padding: 0.4rem 0.8rem;
      }

      .unit-actions {
        position: static;
        justify-content: center;
        margin-top: 1rem;
      }
    }

    @media (max-width: 480px) {
      .dashboard-title {
        font-size: 1.8rem;
      }

      .unit-title {
        font-size: 1.1rem;
      }

      .unit-description {
        font-size: 0.9rem;
      }
    }
  `]
})
export class UnidadesComponent {
  unidades: { id?: number; nombre: string; descripcion: string; subcarpetas: { nombre: string }[]; subcarpetasCount?: number }[] = [];
  mostrarFormulario = false;
  nuevaUnidad = { nombre: '', descripcion: '', subcarpetas: [] as { nombre: string }[] };
  tipoUsuario: string = '';
  creando = false;
  privadas_entregadas = new Set<number>();

  constructor(
    private router: Router,
    private http: HttpClient,
    private analyticsService: AnalyticsService,
    private empresaSvc: EmpresaGruposService
  ) {
    // Para estudiante, lee desde el objeto user en localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.tipoUsuario = user.tipo_usuario || localStorage.getItem('tipo_usuario') || '';
    // Cargar estado de entregadas desde localStorage ANTES del primer render
    this.cargarEntregadasLocal();

    if (this.tipoUsuario === 'estudiante') {
      this.cargarUnidadesHabilitadas();
    } else {
      this.cargarUnidadesDesdeBackend();
    }
  }

  // Carga unidades habilitadas para el estudiante autenticado
  cargarUnidadesHabilitadas() {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) {
      console.log('[UI] No hay token, usando localStorage como fallback');
      this.cargarUnidades();
      return;
    }
    console.log('[UI] GET /auth/estudiantes/me/unidades-habilitadas');
    this.http.get<any[]>(`${environment.apiUrl}/auth/estudiantes/me/unidades-habilitadas`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (unidades) => {
        this.unidades = (unidades || []).map((u: any) => ({
          id: u.id,
          nombre: u.nombre,
          descripcion: u.descripcion || '',
          subcarpetas: Array.from({ length: Number(u.subcarpetas_count || u.subcarpetas || 0) }) as any[]
        }));
        localStorage.setItem('unidades', JSON.stringify(this.unidades));
        this.cargarEntregadasLocal();
        this.precargarEntregadas();
      },
      error: (error) => {
        console.error('[UI] GET unidades-habilitadas ERROR ->', error);
        if (error?.status === 401) {
          alert('Tu sesión ha expirado o no es válida. Inicia sesión nuevamente.');
          localStorage.removeItem('access_token');
          localStorage.removeItem('token');
          this.router.navigate(['/login']);
          return;
        }
        this.cargarUnidades();
      }
    });
  }

  cargarUnidades() {
    const guardadas = localStorage.getItem('unidades');
    if (guardadas) {
      this.unidades = JSON.parse(guardadas);
    } else {
      this.unidades = [
        { nombre: 'Unidad 1', descripcion: 'Introducción a la empresa', subcarpetas: [] },
        { nombre: 'Unidad 2', descripcion: 'Procesos internos', subcarpetas: [] },
        { nombre: 'Unidad 3', descripcion: 'Recursos Humanos', subcarpetas: [] },
        { nombre: 'Unidad 4', descripcion: 'Proyectos', subcarpetas: [] },
      ];
    }
    // Reaplicar estado local por si recargamos sin analytics
    this.cargarEntregadasLocal();
  }

  // Métodos para manejar unidades entregadas se encuentran más abajo en el archivo

  cargarUnidadesDesdeBackend() {
    console.log('[UI] cargarUnidadesDesdeBackend()...');
    this.empresaSvc.listarUnidades().subscribe({
      next: (list) => {
        console.log('[UI] GET /auth/unidades OK ->', list);
        // 1) Mapear al shape local usado por este componente
        const base = (list || []).map((u: any) => {
          const count = Number(u.subcarpetas_count ?? u.subcarpetas ?? 0);
          return {
            id: u.id,
            nombre: u.nombre,
            descripcion: u.descripcion || '',
            subcarpetas: Array.from({ length: count }) as any[],
            subcarpetasCount: count,
          };
        });

        // 2) Intentar fusionar subcarpetas desde localStorage para mantener conteo
        const guardadasRaw = localStorage.getItem('unidades');
        if (guardadasRaw) {
          try {
            const guardadas = JSON.parse(guardadasRaw) as Array<{ nombre: string; subcarpetas?: { nombre: string }[] }>;
            // Mapa por nombre
            const byName = new Map<string, { nombre: string; subcarpetas?: { nombre: string }[] }>();
            guardadas.forEach(u => byName.set((u.nombre || '').toLowerCase().trim(), u));
            base.forEach((u, idx) => {
              const hit = byName.get((u.nombre || '').toLowerCase().trim());
              const stored = hit?.subcarpetas || (guardadas[idx] as any)?.subcarpetas;
              const storedLen = Array.isArray(stored) ? stored.length : 0;
              // Solo sobrescribir la lista si el almacenamiento local tiene MÁS elementos (para mantener compatibilidad con
              // subcarpetas antiguas locales). En todo caso, el contador será el mayor.
              if (storedLen > u.subcarpetas.length) {
                u.subcarpetas = (stored as any[]).slice();
              }
              u.subcarpetasCount = Math.max(u.subcarpetasCount || 0, storedLen);
            });
          } catch {}
        }

        this.unidades = base;
        // 3) Actualizar cache local con la nueva forma para que detalle siga funcionando
        localStorage.setItem('unidades', JSON.stringify(this.unidades));
        this.cargarEntregadasLocal();
        this.precargarEntregadas();
      },
      error: (err) => {
        console.error('[UI] GET /auth/unidades ERROR ->', err);
        // fallback a local
        this.cargarUnidades();
      }
    });
  }

  private precargarEntregadas() {
    if (this.tipoUsuario !== 'estudiante') return;
    this.analyticsService.getAnalyticsUnidades().subscribe({
      next: (arr: any[]) => {
        const nuevosIds = new Set<number>();
        
        (arr || []).forEach((item: any) => {
          const id = Number(item?.unidad_id ?? item?.id);
          const progreso = Number(item?.porcentaje_completado ?? item?.progreso_porcentaje ?? 0);
          
          if (id && !isNaN(id) && progreso >= 100) {
            nuevosIds.add(id);
          }
        });

        // Actualizar el estado local
        this.privadas_entregadas = new Set([...this.privadas_entregadas, ...nuevosIds]);
        
        // Guardar en localStorage
        const key = this.getEntregadasKey();
        localStorage.setItem(key, JSON.stringify(Array.from(this.privadas_entregadas)));
        
        console.log('Estado después de precargar entregadas:', {
          key,
          entregadas: Array.from(this.privadas_entregadas)
        });
      },
      error: (error) => {
        console.error('Error al precargar unidades entregadas:', error);
      }
    });
  }

  private cargarEntregadasLocal() {
    try {
      const raw = localStorage.getItem(this.getEntregadasKey());
      if (!raw) {
        console.log('No se encontraron unidades entregadas en localStorage');
        return;
      }
      
      const ids = JSON.parse(raw);
      if (Array.isArray(ids)) {
        this.privadas_entregadas.clear();
        ids.forEach(id => this.privadas_entregadas.add(Number(id)));
        console.log('Unidades entregadas cargadas desde localStorage:', Array.from(this.privadas_entregadas));
      }
    } catch (error) {
      console.error('Error al cargar unidades entregadas:', error);
    }
  }

  private getEntregadasKey(): string {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const username = user?.username || localStorage.getItem('username') || 'default';
      return `entregadas_ids_${username}`;
    } catch (e) {
      console.error('Error al obtener nombre de usuario:', e);
      return 'entregadas_ids_default';
    }
  }

  guardarUnidades() {
    // Mantener para flujo legacy si se usa localStorage
    localStorage.setItem('unidades', JSON.stringify(this.unidades));
  }

  // sync destructivo deprecado para empresa/profesor. Se mantiene para compatibilidad si fuera necesario.
  sincronizarConBackend() {}

  guardarUnidad() {
    if (!this.nuevaUnidad.nombre.trim()) {
      alert('Por favor ingresa un nombre para la unidad');
      return;
    }

    if (this.tipoUsuario === 'estudiante') {
      // Estudiante no crea; mantener UI local si existía
      this.unidades.push({ ...this.nuevaUnidad, subcarpetas: [] });
      this.guardarUnidades();
      this.nuevaUnidad = { nombre: '', descripcion: '', subcarpetas: [] };
      this.mostrarFormulario = false;
      alert('Unidad guardada localmente (modo estudiante).');
      return;
    }

    // Empresa/Profesor -> crear en backend no destructivo
    const payload = {
      nombre: this.nuevaUnidad.nombre.trim(),
      descripcion: this.nuevaUnidad.descripcion?.trim() || undefined
    };

    console.log('[UI] Usuario tipo:', this.tipoUsuario);
    console.log('[UI] POST /auth/unidades payload ->', payload);
    console.log('[UI] Token disponible:', !!localStorage.getItem('access_token'));

    this.creando = true;

    this.empresaSvc.crearUnidad(payload).subscribe({
      next: (res) => {
        console.log('[UI] POST /auth/unidades OK ->', res);
        this.nuevaUnidad = { nombre: '', descripcion: '', subcarpetas: [] };
        this.cargarUnidadesDesdeBackend();
        this.mostrarFormulario = false;
        this.creando = false;
        alert('Unidad creada correctamente.');
      },
      error: (e) => {
        console.error('[UI] POST /auth/unidades ERROR ->', e);
        console.error('[UI] Error status:', e?.status);
        console.error('[UI] Error message:', e?.message);
        console.error('[UI] Error details:', e);

        this.creando = false;

        let errorMessage = 'Error creando unidad';
        if (e?.status === 401) {
          errorMessage = 'No tienes permisos para crear unidades. Verifica tu autenticación.';
        } else if (e?.status === 403) {
          errorMessage = 'Acceso denegado. Solo usuarios empresa pueden crear unidades.';
        } else if (e?.status === 400) {
          errorMessage = 'Datos inválidos. Verifica el nombre y descripción.';
        } else if (e?.status >= 500) {
          errorMessage = 'Error del servidor. Intenta nuevamente más tarde.';
        } else {
          errorMessage = `Error: ${e?.message || e?.status || 'desconocido'}`;
        }

        alert(errorMessage);
      }
    });
  }
  cancelarUnidad() {
    this.nuevaUnidad = { nombre: '', descripcion: '', subcarpetas: [] };
    this.mostrarFormulario = false;
  }

  irADetalleUnidad(target: any) {
    // target puede ser el objeto unidad o un índice legacy
    let id: number | undefined;
    if (typeof target === 'number') {
      const u = this.unidades[target];
      id = u?.id ?? (target + 1);
    } else if (target && typeof target === 'object') {
      id = target.id;
      if (!id) {
        const idx = this.unidades.indexOf(target);
        id = idx >= 0 ? (this.unidades[idx]?.id ?? idx + 1) : undefined;
      }
    }
    if (!id) return;
    const base = this.tipoUsuario === 'estudiante'
      ? '/dashboard-estudiante/unidades'
      : this.tipoUsuario === 'profesor'
        ? '/dashboard-profesor/unidades'
        : '/dashboard-empresa/unidades';
    this.router.navigate([base, id]);
  }

  eliminarUnidad(idx: number, event: MouseEvent) {
    event.stopPropagation();
    const unidad = this.unidades[idx];

    if (!unidad || !unidad.id) {
      alert('Error: No se puede eliminar la unidad (ID no encontrado)');
      return;
    }

    if (!confirm('¿Seguro que deseas eliminar esta unidad? Esta acción no se puede deshacer.')) return;

    console.log('[UI] Eliminando unidad:', unidad.id);

    this.empresaSvc.eliminarUnidad(unidad.id).subscribe({
      next: (res) => {
        console.log('[UI] Unidad eliminada correctamente:', res);
        this.unidades.splice(idx, 1);
        this.guardarUnidades();
        alert('Unidad eliminada correctamente.');
      },
      error: (error) => {
        console.error('[UI] Error eliminando unidad:', error);
        let errorMessage = 'Error eliminando unidad';
        if (error?.status === 403) {
          errorMessage = 'No tienes permisos para eliminar unidades.';
        } else if (error?.status === 404) {
          errorMessage = 'Unidad no encontrada.';
        } else if (error?.status >= 500) {
          errorMessage = 'Error del servidor. Intenta nuevamente más tarde.';
        } else {
          errorMessage = `Error: ${error?.message || error?.status || 'desconocido'}`;
        }
        alert(errorMessage);
      }
    });
  }

  entregarUnidad(idx: number, event: MouseEvent) {
    event.stopPropagation();
    const unidad = this.unidades[idx];
    const unidadId = unidad?.id;
    
    if (!unidadId) { 
      console.error('No se encontró el ID de la unidad:', unidad);
      alert('No se pudo identificar la unidad. Por favor, recarga la página e intenta nuevamente.'); 
      return; 
    }
    
    console.log('Intentando entregar unidad ID:', unidadId);

    // Asegurar que la relación estudiante_unidad exista/habilitada antes de registrar progreso
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const username = user?.username || localStorage.getItem('username') || '';

    const ensure$ = username ? this.analyticsService.ensureUnidadHabilitada(username, unidadId) : undefined;
    const proceed = () => this.analyticsService.upsertProgreso(unidadId, 100, 100).subscribe({
      next: (response) => {
        console.log('✅ Unidad entregada exitosamente:', response);
        // Actualizar el estado local
        this.privadas_entregadas.add(unidadId);
        
        // Guardar el estado actualizado en localStorage
        const key = this.getEntregadasKey();
        const idsArray = Array.from(this.privadas_entregadas);
        localStorage.setItem(key, JSON.stringify(idsArray));
        
        console.log('Estado después de entregar:', {
          unidadId,
          todasEntregadas: Array.from(this.privadas_entregadas),
          key
        });
        
        alert('Unidad entregada! El profesor calificará tu unidad');
      },
      error: (error) => {
        console.error('❌ Error entregando unidad:', error);
        if (error?.status === 401) {
          alert('Tu sesión ha expirado. Inicia sesión nuevamente para entregar la unidad.');
          localStorage.removeItem('access_token');
          localStorage.removeItem('token');
          this.router.navigate(['/login']);
        } else {
          alert('Error al entregar la unidad. Por favor intenta de nuevo.');
        }
      }
    });

    if (ensure$) {
      ensure$.subscribe({
        next: () => proceed(),
        error: (e: any) => {
          if (e?.status === 401) {
            alert('Tu sesión ha expirado. Inicia sesión nuevamente.');
            localStorage.removeItem('access_token');
            localStorage.removeItem('token');
            this.router.navigate(['/login']);
          } else {
            proceed();
          }
        }
      });
    } else {
      proceed();
    }
  }

  trackByUnidad(index: number, unidad: any): any {
    return unidad.id || index;
  }
}
