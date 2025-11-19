import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GradingV2Service, StudentGradesSummary, UnitGradeDetail, GeneralStatistics } from '../services/grading-v2.service';

@Component({
  selector: 'app-grading-test',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="grading-test-container">
      <h1>🧪 Pruebas del Sistema de Calificaciones V2</h1>
      
      <!-- Panel de Control -->
      <div class="control-panel">
        <h2>Panel de Control</h2>
        <div class="controls">
          <input [(ngModel)]="testUsername" placeholder="Username del estudiante" />
          <input [(ngModel)]="testUnidadId" type="number" placeholder="ID de unidad" />
          <button (click)="runAllTests()" [disabled]="loading">
            {{ loading ? 'Ejecutando...' : '🚀 Ejecutar Todas las Pruebas' }}
          </button>
        </div>
      </div>

      <!-- Resultados -->
      <div class="results-section">
        <h2>📊 Resultados de Pruebas</h2>
        
        <!-- Resumen del Estudiante -->
        <div class="test-card" *ngIf="studentSummary">
          <h3>✅ Resumen del Estudiante: {{ studentSummary.username }}</h3>
          <div class="summary-stats">
            <div class="stat">
              <span class="label">Total Unidades:</span>
              <span class="value">{{ studentSummary.resumen.total_unidades }}</span>
            </div>
            <div class="stat">
              <span class="label">Aprobadas:</span>
              <span class="value success">{{ studentSummary.resumen.unidades_aprobadas }}</span>
            </div>
            <div class="stat">
              <span class="label">Promedio:</span>
              <span class="value">{{ studentSummary.resumen.promedio_general }}%</span>
            </div>
          </div>
        </div>

        <!-- Detalle de Unidad -->
        <div class="test-card" *ngIf="unitDetail">
          <h3>📋 Detalle Unidad {{ unitDetail.unidad_id }}</h3>
          <div class="grade-components">
            <div class="component">
              <span class="component-label">📝 Tareas:</span>
              <span class="component-value">{{ gradingService.formatScore(unitDetail.componentes.tareas.promedio) }}</span>
              <span class="component-count">({{ unitDetail.componentes.tareas.count }} tareas)</span>
            </div>
            <div class="component">
              <span class="component-label">🧩 Quizzes:</span>
              <span class="component-value">{{ gradingService.formatScore(unitDetail.componentes.quizzes.promedio) }}</span>
              <span class="component-count">({{ unitDetail.componentes.quizzes.count }} quizzes)</span>
            </div>
            <div class="component">
              <span class="component-label">⏱️ Tiempo:</span>
              <span class="component-value">{{ unitDetail.componentes.tiempo.score }}%</span>
              <span class="component-count">({{ unitDetail.componentes.tiempo.minutos }} min)</span>
            </div>
            <div class="final-grade">
              <span class="final-label">🎯 Nota Final:</span>
              <span class="final-value" [ngClass]="gradingService.getScoreClass(unitDetail.calificacion_final.nota)">
                {{ unitDetail.calificacion_final.nota }}%
              </span>
              <span class="approval-badge" [ngClass]="gradingService.getApprovalStatusClass(unitDetail)">
                {{ gradingService.getApprovalStatus(unitDetail) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Estadísticas Generales -->
        <div class="test-card" *ngIf="generalStats">
          <h3>📈 Estadísticas Generales</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-number">{{ generalStats.resumen.total_estudiantes }}</span>
              <span class="stat-label">Estudiantes</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ generalStats.resumen.total_tareas_calificadas }}</span>
              <span class="stat-label">Tareas Calificadas</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ generalStats.resumen.total_quizzes_calificados }}</span>
              <span class="stat-label">Quizzes Calificados</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ generalStats.promedios.tareas }}%</span>
              <span class="stat-label">Promedio Tareas</span>
            </div>
          </div>
        </div>

        <!-- Acciones de Prueba -->
        <div class="test-card">
          <h3>🔧 Acciones de Prueba</h3>
          <div class="action-buttons">
            <button (click)="testTaskGrade()" [disabled]="loading">
              📝 Probar Calificación de Tarea
            </button>
            <button (click)="validateConsistency()" [disabled]="loading">
              🔍 Validar Consistencia
            </button>
            <button (click)="syncGrades()" [disabled]="loading">
              🔄 Sincronizar Calificaciones
            </button>
          </div>
        </div>

        <!-- Log de Resultados -->
        <div class="test-card" *ngIf="testLog.length > 0">
          <h3>📋 Log de Pruebas</h3>
          <div class="log-container">
            <div *ngFor="let log of testLog" class="log-entry" [ngClass]="log.type">
              <span class="log-time">{{ log.time }}</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .grading-test-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    h1 {
      color: #667eea;
      text-align: center;
      margin-bottom: 30px;
    }

    .control-panel {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }

    .controls {
      display: flex;
      gap: 15px;
      align-items: center;
      flex-wrap: wrap;
    }

    input {
      padding: 10px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
    }

    button {
      padding: 10px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .test-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      border-left: 4px solid #667eea;
    }

    .summary-stats, .grade-components {
      display: grid;
      gap: 15px;
      margin-top: 15px;
    }

    .stat, .component {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      background: #f8fafc;
      border-radius: 8px;
    }

    .final-grade {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      border-radius: 8px;
      font-weight: 600;
      margin-top: 10px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }

    .stat-item {
      text-align: center;
      padding: 20px;
      background: #f8fafc;
      border-radius: 8px;
    }

    .stat-number {
      display: block;
      font-size: 24px;
      font-weight: bold;
      color: #667eea;
    }

    .stat-label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
    }

    .action-buttons {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      margin-top: 15px;
    }

    .log-container {
      max-height: 300px;
      overflow-y: auto;
      background: #1a202c;
      border-radius: 8px;
      padding: 15px;
    }

    .log-entry {
      display: flex;
      margin-bottom: 8px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
    }

    .log-entry.success { color: #68d391; }
    .log-entry.error { color: #fc8181; }
    .log-entry.info { color: #63b3ed; }

    .log-time {
      color: #a0aec0;
      margin-right: 10px;
      min-width: 60px;
    }

    .approval-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
    }

    .success { color: #10b981; }
    .text-green-600 { color: #10b981; }
    .text-blue-600 { color: #3b82f6; }
    .text-yellow-600 { color: #f59e0b; }
    .text-orange-600 { color: #f97316; }
    .text-red-600 { color: #ef4444; }
    .bg-green-100 { background-color: #dcfce7; }
    .bg-blue-100 { background-color: #dbeafe; }
    .bg-yellow-100 { background-color: #fef3c7; }
    .text-green-800 { color: #166534; }
    .text-blue-800 { color: #1e40af; }
    .text-yellow-800 { color: #92400e; }
  `]
})
export class GradingTestComponent implements OnInit {
  testUsername = 'estudiante1';
  testUnidadId = 1;
  loading = false;

  studentSummary: StudentGradesSummary | null = null;
  unitDetail: UnitGradeDetail | null = null;
  generalStats: GeneralStatistics | null = null;

  testLog: Array<{time: string, message: string, type: 'success' | 'error' | 'info'}> = [];

  constructor(public gradingService: GradingV2Service) {}

  ngOnInit() {
    this.log('🚀 Componente de pruebas inicializado', 'info');
  }

  async runAllTests() {
    this.loading = true;
    this.testLog = [];
    this.log('🧪 Iniciando suite completa de pruebas...', 'info');

    try {
      // Prueba 1: Resumen del estudiante
      await this.loadStudentSummary();
      
      // Prueba 2: Detalle de unidad
      await this.loadUnitDetail();
      
      // Prueba 3: Estadísticas generales
      await this.loadGeneralStats();
      
      // Prueba 4: Validar consistencia
      await this.validateConsistency();

      this.log('✅ Todas las pruebas completadas exitosamente', 'success');
    } catch (error) {
      this.log(`❌ Error en las pruebas: ${error}`, 'error');
    } finally {
      this.loading = false;
    }
  }

  async loadStudentSummary() {
    try {
      const result = await this.gradingService.getStudentGradesSummary(this.testUsername).toPromise();
      this.studentSummary = result || null;
      this.log(`✅ Resumen del estudiante cargado: ${this.studentSummary?.resumen.total_unidades} unidades`, 'success');
    } catch (error) {
      this.log(`❌ Error cargando resumen: ${error}`, 'error');
      throw error;
    }
  }

  async loadUnitDetail() {
    try {
      const result = await this.gradingService.getUnitGradeDetail(this.testUsername, this.testUnidadId).toPromise();
      this.unitDetail = result || null;
      this.log(`✅ Detalle de unidad cargado: Nota ${this.unitDetail?.calificacion_final.nota}%`, 'success');
    } catch (error) {
      this.log(`❌ Error cargando detalle de unidad: ${error}`, 'error');
      throw error;
    }
  }

  async loadGeneralStats() {
    try {
      const result = await this.gradingService.getGeneralStatistics().toPromise();
      this.generalStats = result || null;
      this.log(`✅ Estadísticas generales cargadas: ${this.generalStats?.resumen.total_estudiantes} estudiantes`, 'success');
    } catch (error) {
      this.log(`❌ Error cargando estadísticas: ${error}`, 'error');
      throw error;
    }
  }

  async testTaskGrade() {
    this.loading = true;
    try {
      const result = await this.gradingService.updateTaskGrade({
        estudiante_username: this.testUsername,
        unidad_id: this.testUnidadId,
        filename: 'test_tarea.pdf',
        score: 85
      }).toPromise();

      if (result && result.success) {
        this.log(`✅ Calificación de tarea actualizada: ${result.score}%`, 'success');
        // Recargar datos
        await this.loadUnitDetail();
      } else {
        this.log(`❌ Error actualizando tarea: ${result?.error || 'Error desconocido'}`, 'error');
      }
    } catch (error) {
      this.log(`❌ Error en calificación de tarea: ${error}`, 'error');
    } finally {
      this.loading = false;
    }
  }

  async validateConsistency() {
    try {
      const result = await this.gradingService.validateConsistency().toPromise();
      if (result && result.consistente) {
        this.log('✅ Sistema consistente - No se encontraron problemas', 'success');
      } else if (result) {
        this.log(`⚠️ Se encontraron ${result.inconsistencias_encontradas} inconsistencias`, 'error');
        result.detalles_inconsistencias.forEach(detalle => {
          this.log(`  - ${detalle}`, 'error');
        });
      } else {
        this.log('❌ No se pudo obtener resultado de validación', 'error');
      }
    } catch (error) {
      this.log(`❌ Error validando consistencia: ${error}`, 'error');
    }
  }

  async syncGrades() {
    this.loading = true;
    try {
      const result = await this.gradingService.syncAllGrades().toPromise();
      if (result && result.success) {
        this.log(`✅ Sincronización completada: ${result.resultados?.estudiantes_procesados} estudiantes`, 'success');
      } else {
        this.log(`❌ Error en sincronización: ${result?.error || 'Error desconocido'}`, 'error');
      }
    } catch (error) {
      this.log(`❌ Error sincronizando: ${error}`, 'error');
    } finally {
      this.loading = false;
    }
  }

  private log(message: string, type: 'success' | 'error' | 'info') {
    const time = new Date().toLocaleTimeString();
    this.testLog.push({ time, message, type });
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}
