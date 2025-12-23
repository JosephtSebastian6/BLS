import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { EmpresaGruposService } from '../services/empresa-grupos.service';
import { forkJoin } from 'rxjs';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-profesor-calificar',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './profesor-calificar.component.html',
  styleUrls: ['./profesor-calificar.component.css']
})
export class ProfesorCalificarComponent implements OnInit {
  estudiantesAsignados: Array<{ identificador: number; username: string; nombres: string; apellidos: string }> = [];
  unidades: Array<{ id: number; nombre: string }> = [];
  quizzes: Array<{ id: number; titulo: string }>|null = null;
  cargando = false;
  msg = '';
  cargandoFinal = false;
  msgFinal = '';
  historial: { tareas: any[]; quizzes: any[]; unidades: any[] } = { tareas: [], quizzes: [], unidades: [] };

  form = {
    estudiante_username: '',
    unidad_id: null as number | null,
    tipo: 'tarea' as 'tarea' | 'quiz',
    filename: '',
    quiz_id: null as number | null,
    score: null as number | null,
  };

  // Calificación global (override)
  formFinal = { score: null as number | null, aprobado: false };
  finalUnidadesSeleccionadas: number[] = [];

  private backendBase = environment.apiUrl;

  constructor(private http: HttpClient, private gruposSvc: EmpresaGruposService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.route.queryParams.subscribe(q => {
      if (q['estudiante']) this.form.estudiante_username = q['estudiante'];
      if (q['unidad']) this.form.unidad_id = Number(q['unidad']);
      if (q['tipo'] === 'tarea' || q['tipo'] === 'quiz') this.form.tipo = q['tipo'];
      if (q['filename']) this.form.filename = q['filename'];
    });
    const profesorUsername = user?.username;
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ 'Authorization': `Bearer ${token}` }) : undefined;

    if (profesorUsername) {
      this.http.get<Array<{ identificador: number; username: string; nombres: string; apellidos: string }>>(
        `${this.backendBase}/auth/profesores/${encodeURIComponent(profesorUsername)}/estudiantes`, { headers }
      ).subscribe({
        next: (est) => {
          this.estudiantesAsignados = est || [];
          if (!this.form.estudiante_username && this.estudiantesAsignados[0]) {
            this.form.estudiante_username = this.estudiantesAsignados[0].username;
          }
          if (this.form.estudiante_username) {
            this.cargarHistorial(this.form.estudiante_username);
            this.cargarUnidadesParaEstudiante(this.form.estudiante_username);
          }
        },
        error: () => { this.estudiantesAsignados = []; }
      });
      // Las unidades se cargarán según el estudiante seleccionado
    }
  }

  guardarFinal(): void {
    this.msgFinal = '';
    if (!this.form.estudiante_username) { this.msgFinal = 'Selecciona estudiante.'; return; }
    const unidadIds = this.finalUnidadesSeleccionadas.length ? this.finalUnidadesSeleccionadas : (this.form.unidad_id ? [this.form.unidad_id] : []);
    if (!unidadIds.length) { this.msgFinal = 'Selecciona al menos una unidad.'; return; }
    let scoreVal: number | null = null;
    if (this.formFinal.score != null && this.formFinal.score !== undefined && this.formFinal.score !== ('' as any)) {
      scoreVal = Math.max(0, Math.min(100, Number(this.formFinal.score)));
      if (Number.isNaN(scoreVal)) { this.msgFinal = 'Score final inválido'; return; }
    }
    this.cargandoFinal = true;
    const requests = unidadIds.map(unidadId => this.gruposSvc.upsertUnidadCalificacionFinal({
      estudiante_username: this.form.estudiante_username,
      unidad_id: unidadId,
      score: scoreVal,
      aprobado: this.formFinal.aprobado
    }));
    forkJoin(requests).subscribe({
      next: () => {
        this.cargandoFinal = false;
        this.msgFinal = `Calificación final guardada en ${unidadIds.length} unidad(es).`;
        setTimeout(() => this.msgFinal = '', 2500);
        this.cargarHistorial(this.form.estudiante_username);
      },
      error: (e) => {
        this.cargandoFinal = false;
        this.msgFinal = e?.error?.detail || 'No se pudo guardar la calificación final en alguna unidad.';
      }
    });
  }

  onUnidadChange(id: number | null) {
    this.form.unidad_id = id;
    this.quizzes = null;
    if (id) this.cargarQuizzes(id);
  }

  private cargarQuizzes(unidadId: number) {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ 'Authorization': `Bearer ${token}` }) : undefined;
    this.http.get<any[]>(`${this.backendBase}/auth/unidades/${unidadId}/quizzes`, { headers })
      .subscribe({
        next: (qs) => {
          this.quizzes = (qs || []).map(q => ({ id: q.id ?? q.quiz_id ?? q.quizId ?? q.id_quiz, titulo: q.titulo ?? q.nombre ?? `Quiz ${q.id}` }));
        },
        error: () => { this.quizzes = []; }
      });
  }

  onEstudianteChange(username: string) {
    this.form.estudiante_username = username;
    this.cargarHistorial(username);
    this.cargarUnidadesParaEstudiante(username);
  }

  private cargarHistorial(username: string) {
    if (!username) { this.historial = { tareas: [], quizzes: [], unidades: [] }; return; }
    forkJoin({
      tareas: this.gruposSvc.listarTareasCalificaciones(username),
      quizzes: this.gruposSvc.listarQuizzesCalificaciones(username),
      unidades: this.gruposSvc.listarUnidadesFinales(username)
    }).subscribe({
      next: (res) => {
        this.historial = {
          tareas: res?.tareas || [],
          quizzes: res?.quizzes || [],
          unidades: res?.unidades || []
        };
      },
      error: () => { this.historial = { tareas: [], quizzes: [], unidades: [] }; }
    });
  }

  private cargarUnidadesParaEstudiante(username: string) {
    if (!username) { this.unidades = []; return; }
    this.gruposSvc.listarUnidadesHabilitadas(username).subscribe({
      next: (u: Array<{ id: number; nombre: string }>) => {
        this.unidades = (u || []).map(x => ({ id: x.id, nombre: x.nombre }));
        // Resetear unidad simple si ya no existe
        if (!this.unidades.find(x => x.id === this.form.unidad_id)) {
          this.form.unidad_id = this.unidades[0]?.id ?? null;
        }
        // Filtrar selección múltiple
        this.finalUnidadesSeleccionadas = (this.finalUnidadesSeleccionadas || []).filter(id => this.unidades.some(u2 => u2.id === id));
        if (this.form.unidad_id) { this.cargarQuizzes(this.form.unidad_id); }
      },
      error: () => { this.unidades = []; }
    });
  }

  guardar(): void {
    this.msg = '';
    if (!this.form.estudiante_username || !this.form.unidad_id || this.form.score == null) {
      this.msg = 'Completa estudiante, unidad y score (0-100).';
      return;
    }
    const score = Math.max(0, Math.min(100, Number(this.form.score)));
    this.cargando = true;
    const done = () => { this.cargando = false; this.msg = 'Calificación guardada.'; setTimeout(() => this.msg = '', 2500); };
    const fail = (e: any) => { this.cargando = false; this.msg = e?.error?.detail || 'No se pudo guardar.'; };

    if (this.form.tipo === 'tarea') {
      if (!this.form.filename?.trim()) { this.msg = 'Ingresa el nombre del archivo (tarea).'; this.cargando = false; return; }
      this.gruposSvc.upsertTareaCalificacion({
        estudiante_username: this.form.estudiante_username,
        unidad_id: this.form.unidad_id!,
        filename: this.form.filename.trim(),
        score
      }).subscribe({ next: () => { done(); this.cargarHistorial(this.form.estudiante_username); }, error: fail });
    } else {
      if (!this.form.quiz_id) { this.msg = 'Selecciona un quiz.'; this.cargando = false; return; }
      this.gruposSvc.upsertQuizCalificacion({
        estudiante_username: this.form.estudiante_username,
        unidad_id: this.form.unidad_id!,
        quiz_id: this.form.quiz_id!,
        score
      }).subscribe({ next: () => { done(); this.cargarHistorial(this.form.estudiante_username); }, error: fail });
    }
  }

  // Métodos helper para el template moderno
  getTotalCalificaciones(): number {
    return (this.historial.tareas?.length || 0) + 
           (this.historial.quizzes?.length || 0) + 
           (this.historial.unidades?.length || 0);
  }

  getScoreClass(score: any): string {
    if (score === null || score === undefined || score === '') return 'score-none';
    const numScore = Number(score);
    if (numScore >= 80) return 'score-high';
    if (numScore >= 60) return 'score-medium';
    return 'score-low';
  }

  getScoreLabel(score: any): string {
    if (score === null || score === undefined || score === '') return '';
    const numScore = Number(score);
    if (numScore >= 80) return '🟢 Excelente';
    if (numScore >= 60) return '🟡 Bueno';
    return '🔴 Necesita mejorar';
  }

  isFormValid(): boolean {
    return !!(this.form.estudiante_username && 
              this.form.unidad_id && 
              this.form.score !== null && 
              this.form.score !== undefined &&
              ((this.form.tipo === 'tarea' && this.form.filename?.trim()) ||
               (this.form.tipo === 'quiz' && this.form.quiz_id)));
  }

  getMessageClass(message: string): string {
    if (message.toLowerCase().includes('guardad') || message.toLowerCase().includes('éxito')) {
      return 'message-success';
    }
    return 'message-error';
  }

  getMessageIcon(message: string): string {
    if (message.toLowerCase().includes('guardad') || message.toLowerCase().includes('éxito')) {
      return '✅';
    }
    return '❌';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Sin fecha';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getApprovalIcon(aprobado: any): string {
    if (aprobado === true) return '✅';
    if (aprobado === false) return '❌';
    return '⚪';
  }

  getApprovalText(aprobado: any): string {
    if (aprobado === true) return 'Aprobado';
    if (aprobado === false) return 'No Aprobado';
    return 'Sin definir';
  }

  getApprovalClass(aprobado: any): string {
    if (aprobado === true) return 'approval-yes';
    if (aprobado === false) return 'approval-no';
    return 'approval-none';
  }

  // Métodos para calificación global
  isUnitSelected(unitId: number): boolean {
    return this.finalUnidadesSeleccionadas.includes(unitId);
  }

  toggleUnit(unitId: number): void {
    const index = this.finalUnidadesSeleccionadas.indexOf(unitId);
    if (index > -1) {
      this.finalUnidadesSeleccionadas.splice(index, 1);
    } else {
      this.finalUnidadesSeleccionadas.push(unitId);
    }
  }

  getSelectedUnitsCount(): number {
    return this.finalUnidadesSeleccionadas.length;
  }

  canSaveGlobal(): boolean {
    return this.finalUnidadesSeleccionadas.length > 0;
  }

  // Métodos de tracking para optimización
  trackByEstudiante(index: number, estudiante: any): string {
    return estudiante.username;
  }

  trackByUnidad(index: number, unidad: any): number {
    return unidad.id;
  }

  trackByQuiz(index: number, quiz: any): number {
    return quiz.id;
  }

  trackByTarea(index: number, tarea: any): string {
    return `${tarea.unidad_id}-${tarea.filename}`;
  }

  trackByUnidadFinal(index: number, unidad: any): string {
    return `${unidad.unidad_id}-final`;
  }

  // Métodos helper para evitar errores de undefined
  hasTareas(): boolean {
    return !!(this.historial?.tareas && this.historial.tareas.length > 0);
  }

  hasQuizzes(): boolean {
    return !!(this.historial?.quizzes && this.historial.quizzes.length > 0);
  }

  hasUnidades(): boolean {
    return !!(this.historial?.unidades && this.historial.unidades.length > 0);
  }

  hasUnidadesDisponibles(): boolean {
    return !!(this.unidades && this.unidades.length > 0);
  }
}
