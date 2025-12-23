import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { forkJoin } from 'rxjs';

interface Estudiante {
  identificador: number;
  username: string;
  nombres: string;
  apellidos: string;
  email: string;
  tipo_usuario: string;
}

interface Clase {
  id: number;
  dia: string;
  hora: string;
  tema: string;
  meet_link: string;
  profesor_username: string;
  profesor_nombres?: string;
  profesor_apellidos?: string;
  estudiantes: any[];
}

interface Matricula {
  id: number;
  estudiante: string;
  email: string;
  curso: string;
  fechaMatricula: string;
  estado: string;
  profesor: string;
  estudianteUsername: string;
  claseId: number;
}

@Component({
  selector: 'app-matriculas',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  template: `
  <div class="dashboard-container">
    <!-- Header Section -->
    <div class="dashboard-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="dashboard-title">📋 Gestión de Matrículas</h1>
          <p class="dashboard-subtitle">Administra y supervisa las matrículas de estudiantes en los diferentes cursos de inglés</p>
        </div>
        <div class="header-stats">
          <div class="stat-card">
            <div class="stat-value">{{ matriculas.length }}</div>
            <div class="stat-label">📊 Total</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div *ngIf="loading" class="loading-container">
      <div class="loading-spinner">⏳</div>
      <h3 class="loading-title">Cargando Matrículas</h3>
      <p class="loading-text">Obteniendo información de estudiantes...</p>
    </div>

    <!-- Error State -->
    <div *ngIf="error" class="error-container">
      <div class="error-icon">❌</div>
      <h3 class="error-title">Error al Cargar</h3>
      <p class="error-text">{{ error }}</p>
      <button class="retry-btn" (click)="cargarMatriculas()">
        <span class="btn-icon">🔄</span>
        Reintentar
      </button>
    </div>

    <!-- Main Content -->
    <div *ngIf="!loading && !error" class="main-content">
      <!-- Stats Summary -->
      <div class="stats-summary">
        <div class="summary-card active">
          <div class="summary-icon">✅</div>
          <div class="summary-content">
            <div class="summary-value">{{ getMatriculasPorEstado('Activa').length }}</div>
            <div class="summary-label">Activas</div>
          </div>
        </div>
        <div class="summary-card pending">
          <div class="summary-icon">⏳</div>
          <div class="summary-content">
            <div class="summary-value">{{ getMatriculasPorEstado('Pendiente').length }}</div>
            <div class="summary-label">Pendientes</div>
          </div>
        </div>
        <div class="summary-card inactive">
          <div class="summary-icon">❌</div>
          <div class="summary-content">
            <div class="summary-value">{{ getMatriculasPorEstado('Inactiva').length }}</div>
            <div class="summary-label">Inactivas</div>
          </div>
        </div>
      </div>

      <!-- Table Container -->
      <div class="table-container">
        <div class="table-header">
          <h3 class="table-title">📋 Lista de Matrículas</h3>
          <div class="table-actions">
            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input type="text" placeholder="Buscar estudiante..." class="search-input">
            </div>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="matriculas-table">
            <thead>
              <tr>
                <th>🆔 ID</th>
                <th>👤 Estudiante</th>
                <th>📧 Email</th>
                <th>👨‍🏫 Profesor</th>
                <th>📅 Fecha</th>
                <th>📊 Estado</th>
                <th>🔐 Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let matricula of matriculas; trackBy: trackByMatricula" class="matricula-row">
                <td class="matricula-id">
                  <span class="id-badge">#{{ matricula.id }}</span>
                </td>
                <td class="matricula-estudiante">
                  <div class="student-info">
                    <div class="student-avatar">
                      <span class="avatar-text">{{ getInitials(matricula.estudiante) }}</span>
                    </div>
                    <div class="student-details">
                      <span class="student-name">{{ matricula.estudiante }}</span>
                      <span class="student-username">@{{ matricula.estudianteUsername }}</span>
                    </div>
                  </div>
                </td>
                <td class="matricula-email">
                  <span class="email-text">{{ matricula.email }}</span>
                </td>
                <td class="matricula-profesor">
                  <div class="professor-info">
                    <span class="professor-icon">👨‍🏫</span>
                    <span class="professor-name">{{ matricula.profesor }}</span>
                  </div>
                </td>
                <td class="matricula-fecha">
                  <div class="date-info">
                    <span class="date-icon">📅</span>
                    <span class="date-text">{{ matricula.fechaMatricula | date:'dd/MM/yyyy' }}</span>
                  </div>
                </td>
                <td class="matricula-estado">
                  <span class="status-badge" [class]="getEstadoClass(matricula.estado)">
                    <span class="status-icon">{{ getStatusIcon(matricula.estado) }}</span>
                    {{ matricula.estado }}
                  </span>
                </td>
                <td class="matricula-acciones">
                  <div class="actions-group">
                    <button 
                      class="action-btn toggle-btn"
                      [class.activate]="matricula.estado === 'Inactiva'"
                      [class.deactivate]="matricula.estado === 'Activa'"
                      [title]="matricula.estado === 'Activa' ? 'Desactivar matrícula' : 'Activar matrícula'"
                      (click)="toggleMatricula(matricula.estudianteUsername)">
                      <span class="action-icon">{{ matricula.estado === 'Activa' ? '🔒' : '🔓' }}</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="matriculas.length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <h3 class="empty-title">No hay matrículas registradas</h3>
        <p class="empty-description">Cuando se registren estudiantes, aparecerán aquí</p>
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

    .btn-icon {
      font-size: 1.2rem;
    }

    /* Main Content */
    .main-content {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    /* Stats Summary */
    .stats-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
    }

    .summary-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      padding: 1.5rem;
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: var(--transition);
    }

    .summary-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 50px rgba(0, 0, 0, 0.15);
    }

    .summary-card.active {
      border-left: 4px solid var(--success-color);
    }

    .summary-card.pending {
      border-left: 4px solid var(--warning-color);
    }

    .summary-card.inactive {
      border-left: 4px solid var(--error-color);
    }

    .summary-icon {
      font-size: 2.5rem;
      opacity: 0.8;
    }

    .summary-content {
      flex: 1;
    }

    .summary-value {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 0.3rem;
    }

    .summary-label {
      font-size: 1rem;
      color: var(--text-secondary);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
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

    .table-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 1rem;
      font-size: 1.2rem;
      color: var(--text-secondary);
    }

    .search-input {
      padding: 0.8rem 1rem 0.8rem 3rem;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.9);
      color: var(--text-primary);
      font-size: 1rem;
      width: 250px;
      transition: var(--transition);
    }

    .search-input:focus {
      outline: none;
      border-color: rgba(255, 255, 255, 0.8);
      background: white;
    }

    .search-input::placeholder {
      color: var(--text-secondary);
    }

    /* Table */
    .table-wrapper {
      overflow-x: auto;
    }

    .matriculas-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
    }

    .matriculas-table th {
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

    .matricula-row {
      transition: var(--transition);
      border-bottom: 1px solid rgba(226, 232, 240, 0.3);
    }

    .matricula-row:hover {
      background: rgba(102, 126, 234, 0.05);
    }

    .matriculas-table td {
      padding: 1.2rem 1rem;
      vertical-align: middle;
    }

    /* Table Cell Styles */
    .id-badge {
      background: rgba(102, 126, 234, 0.1);
      color: var(--primary-color);
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-weight: 700;
      font-size: 0.9rem;
    }

    .student-info {
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


    .professor-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .professor-icon {
      font-size: 1.2rem;
    }

    .professor-name {
      font-weight: 600;
      color: var(--text-primary);
    }

    .date-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .date-icon {
      font-size: 1.2rem;
    }

    .date-text {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    /* Status Badges */
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

    .estado-activa {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success-color);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .estado-pendiente {
      background: rgba(245, 158, 11, 0.1);
      color: var(--warning-color);
      border: 1px solid rgba(245, 158, 11, 0.2);
    }

    .estado-inactiva {
      background: rgba(239, 68, 68, 0.1);
      color: var(--error-color);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .status-icon {
      font-size: 1rem;
    }

    /* Actions */
    .actions-group {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: var(--transition);
      font-size: 1rem;
    }

    .toggle-btn.activate {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success-color);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .toggle-btn.activate:hover {
      background: var(--success-color);
      color: white;
      transform: translateY(-2px);
    }

    .toggle-btn.deactivate {
      background: rgba(239, 68, 68, 0.1);
      color: var(--error-color);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .toggle-btn.deactivate:hover {
      background: var(--error-color);
      color: white;
      transform: translateY(-2px);
    }


    .action-icon {
      font-size: 1.2rem;
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

      .stats-summary {
        grid-template-columns: 1fr;
      }

      .table-header {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }

      .search-input {
        width: 100%;
      }

      .matriculas-table {
        font-size: 0.8rem;
      }

      .matriculas-table th,
      .matriculas-table td {
        padding: 0.8rem 0.5rem;
      }

      .student-info {
        flex-direction: column;
        gap: 0.5rem;
        text-align: center;
      }

      .student-avatar {
        width: 35px;
        height: 35px;
      }

      .action-btn {
        width: 35px;
        height: 35px;
      }
    }
  `]
})
export class MatriculasComponent implements OnInit {
  matriculas: Matricula[] = [];
  loading = true;
  error = '';
  private apiUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.cargarMatriculas();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  cargarMatriculas() {
    this.loading = true;
    this.error = '';

    // Obtener todos los estudiantes registrados en la plataforma
    this.http.get<Estudiante[]>(`${this.apiUrl}/matriculas/`, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (estudiantes) => {
        this.procesarMatriculas(estudiantes);
      },
      error: (error) => {
        console.error('Error cargando estudiantes:', error);
        this.error = 'Error al cargar las matrículas. Por favor, intenta de nuevo.';
        this.loading = false;
      }
    });
  }

  private procesarMatriculas(estudiantes: Estudiante[]) {
    this.matriculas = estudiantes.map((estudiante, index) => ({
      id: index + 1,
      estudiante: `${estudiante.nombres} ${estudiante.apellidos}`,
      email: estudiante.email,
      curso: 'Plataforma de Inglés',
      fechaMatricula: this.generarFechaMatricula(),
      estado: (estudiante as any).matricula_activa ? 'Activa' : 'Inactiva',
      profesor: 'Sistema',
      estudianteUsername: estudiante.username,
      claseId: 0
    }));
    
    this.loading = false;
  }

  private generarFechaMatricula(): string {
    // Generar fecha aleatoria en los últimos 30 días
    const hoy = new Date();
    const diasAtras = Math.floor(Math.random() * 30);
    const fecha = new Date(hoy.getTime() - (diasAtras * 24 * 60 * 60 * 1000));
    return fecha.toISOString().split('T')[0];
  }

  toggleMatricula(username: string) {
    this.http.put(`${this.apiUrl}/matriculas/${username}/toggle`, {}, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (response: any) => {
        // Actualizar el estado local
        const matricula = this.matriculas.find(m => m.estudianteUsername === username);
        if (matricula) {
          matricula.estado = response.matricula_activa ? 'Activa' : 'Inactiva';
        }
      },
      error: (error) => {
        console.error('Error actualizando matrícula:', error);
        this.error = 'Error al actualizar la matrícula.';
      }
    });
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'Activa': return 'estado-activa';
      case 'Pendiente': return 'estado-pendiente';
      case 'Inactiva': return 'estado-inactiva';
      default: return '';
    }
  }

  getMatriculasPorEstado(estado: string): any[] {
    return this.matriculas.filter(m => m.estado === estado);
  }

  getInitials(fullName: string): string {
    return fullName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  getStatusIcon(estado: string): string {
    switch (estado) {
      case 'Activa': return '✅';
      case 'Pendiente': return '⏳';
      case 'Inactiva': return '❌';
      default: return '❓';
    }
  }

  trackByMatricula(index: number, matricula: Matricula): number {
    return matricula.id;
  }
}
