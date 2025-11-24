import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { QuizzesService, QuizDetalleEstudiante } from '../services/quizzes.service';

@Component({
  selector: 'app-evaluacion-rendir',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  template: `
  <div class="card" *ngIf="quiz && !loading">
    <div class="card-header">
      <h2>{{ quiz.titulo }}</h2>
      <button type="button" class="btn-outline" (click)="volver()" onclick="console.log('Botón volver clickeado')">Volver</button>
    </div>
    <div class="card-body">
      <p class="desc">{{ quiz.descripcion }}</p>
      <div class="attempts" *ngIf="quiz">
        <ng-container *ngIf="quiz.max_intentos && quiz.max_intentos > 0; else intentosIlimitados">
          <span>Intentos usados: {{ quiz.intentos_realizados || 0 }} / {{ quiz.max_intentos }}</span>
        </ng-container>
        <ng-template #intentosIlimitados>
          <span>Intentos usados: {{ quiz.intentos_realizados || 0 }} (ilimitados)</span>
        </ng-template>
      </div>

      <div class="time-info" *ngIf="quiz">
        <ng-container *ngIf="quiz.tiempo_limite_minutos && quiz.tiempo_limite_minutos > 0; else sinLimiteTiempo">
          <span *ngIf="!tiempoAgotado">
            Tiempo límite: {{ quiz.tiempo_limite_minutos }} min ·
            Tiempo restante: {{ formatoTiempo(tiempoRestante) }}
          </span>
          <span *ngIf="tiempoAgotado">
            ⏱ Se agotó el tiempo para este intento.
          </span>
        </ng-container>
        <ng-template #sinLimiteTiempo>
          <span>Sin límite de tiempo.</span>
        </ng-template>
      </div>
      
      <!-- Mostrar info de intentos y calificación -->
      <div *ngIf="quiz.ya_respondido" class="alert alert-info">
        <h3>✅ Intentos realizados</h3>
        <p>Has respondido esta evaluación {{ quiz.intentos_realizados || 1 }} vez(es).</p>
        <p *ngIf="quiz.calificacion !== null"><strong>Mejor calificación: {{ quiz.calificacion }}/100</strong></p>
        <p *ngIf="quiz.fecha_respuesta">Último intento: {{ quiz.fecha_respuesta | date:'short' }}</p>
        <p *ngIf="quiz.max_intentos && quiz.max_intentos > 0">
          Límite de intentos: {{ quiz.max_intentos }}.
          <span *ngIf="quiz.puede_intentar">Aún puedes volver a intentarlo.</span>
          <span *ngIf="!quiz.puede_intentar">Ya no tienes más intentos disponibles.</span>
        </p>
      </div>

      <!-- Formulario de respuestas (solo si todavía puede intentar y no se agotó el tiempo) -->
      <div *ngIf="quiz.puede_intentar !== false">
        <!-- Solo mostramos tipos soportados actualmente: opcion_multiple y vf -->
        <div class="q-item" *ngFor="let it of itemsFiltrados; let i = index">
          <h3>{{ i+1 }}. {{ it.enunciado }}</h3>
          <ng-container [ngSwitch]="it.tipo">
            <div *ngSwitchCase="'opcion_multiple'">
              <label class="row" *ngFor="let op of it.opciones; let j=index">
                <input type="radio" 
                       [name]="'pregunta_' + i" 
                       [checked]="respuestas['pregunta_' + i] === j"
                       (change)="seleccionarRespuesta(i, j)" />
                <span>{{ op.texto }}</span>
              </label>
            </div>
            <div *ngSwitchCase="'vf'">
              <label class="row">
                <input type="radio" 
                       [name]="'pregunta_' + i" 
                       [checked]="respuestas['pregunta_' + i] === true"
                       (change)="seleccionarRespuesta(i, true)" />
                <span>Verdadero</span>
              </label>
              <label class="row">
                <input type="radio" 
                       [name]="'pregunta_' + i" 
                       [checked]="respuestas['pregunta_' + i] === false"
                       (change)="seleccionarRespuesta(i, false)" />
                <span>Falso</span>
              </label>
            </div>
            <!-- Tipo 'respuesta_corta' se omite temporalmente -->
          </ng-container>
        </div>
        
        <div class="form-actions" *ngIf="itemsFiltrados.length > 0">
          <button type="button" class="btn-primary" [disabled]="enviando || tiempoAgotado" (click)="enviarRespuestas()" onclick="console.log('Botón enviar clickeado')">
            {{ enviando ? 'Enviando...' : 'Enviar Respuestas' }}
          </button>
        </div>
      </div>
    </div>
  </div>
  
  <div class="card" *ngIf="loading">
    <div class="card-body">
      <p>Cargando evaluación...</p>
    </div>
  </div>
  `,
  styles: [`
    :host { position: relative !important; z-index: 10000 !important; }
    * { pointer-events: auto !important; }
    .card{max-width:900px;margin:2rem auto;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.06);position:relative !important;z-index:99999 !important}
    .card-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid rgba(0,0,0,.06)}
    .card-body{padding:1rem 1.25rem}
    .btn-outline{border:1px solid #cbd5e1;background:#fff;color:#1f2937;border-radius:10px;padding:.5rem .8rem;text-decoration:none;cursor:pointer;pointer-events:auto !important}
    .q-item{border:1px solid #e5e7eb;border-radius:12px;padding:.8rem 1rem;margin:12px 0}
    .row{display:flex;gap:8px;align-items:center;margin:.3rem 0;cursor:pointer;padding:4px 8px;border-radius:6px;transition:background-color 0.2s;pointer-events:auto !important}
    .row:hover{background-color:#f8f9fa}
    .row input[type="radio"]{margin:0;cursor:pointer;pointer-events:auto !important}
    .row span{pointer-events:auto !important;cursor:pointer}
    .short{width:100%;border:1px solid #e5e7eb;border-radius:10px;padding:.5rem .7rem;pointer-events:auto !important}
    .alert{border:1px solid #d1ecf1;background:#d1ecf1;color:#0c5460;border-radius:10px;padding:1rem;margin:1rem 0}
    .alert-info{border-color:#bee5eb;background:#d1ecf1}
    .time-info{margin:.25rem 0 1rem 0;color:#4b5563;font-size:.85rem}
    .attempts{margin:.75rem 0;color:#4b5563;font-size:.9rem;font-weight:500}
    .form-actions{margin-top:1.5rem;text-align:center}
    .btn-primary{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;border-radius:10px;padding:.75rem 1.5rem;cursor:pointer;font-size:1rem;pointer-events:auto !important}
    .btn-primary:disabled{opacity:0.6;cursor:not-allowed}
  `]
})
export class EvaluacionRendirComponent implements OnInit, OnDestroy {
  quiz!: QuizDetalleEstudiante;
  respuestas: { [key: string]: any } = {};
  items: any[] = [];
  // Solo los items que vamos a preguntar (sin respuesta_corta por ahora)
  itemsFiltrados: any[] = [];
  loading = false;
  enviando = false;
  tiempoRestante: number | null = null; // en segundos
  tiempoAgotado = false;
  intentoEnCurso = false;
  private countdownId: any = null;
  
  constructor(private api: QuizzesService, private route: ActivatedRoute, private router: Router) {}
  
  seleccionarRespuesta(preguntaIndex: number, valor: any) {
    console.log(`Seleccionando respuesta para pregunta ${preguntaIndex}:`, valor);
    this.respuestas[`pregunta_${preguntaIndex}`] = valor;
    console.log('Estado actual de respuestas:', this.respuestas);
  }
  
  actualizarTexto(preguntaIndex: number, event: any) {
    const valor = event.target.value;
    console.log(`Actualizando texto para pregunta ${preguntaIndex}:`, valor);
    this.respuestas[`pregunta_${preguntaIndex}`] = valor;
  }
  
  ngOnInit(){
    this.loading = true;
    const id = Number(this.route.snapshot.paramMap.get('id'));
    
    this.api.obtenerDetalleEstudiante(id).subscribe({
      next: (quiz) => {
        console.log('Quiz recibido:', quiz);
        console.log('Preguntas raw:', quiz.preguntas);
        
        this.quiz = quiz;
        
        // Intentar diferentes estructuras de preguntas
        if (quiz.preguntas?.preguntas) {
          this.items = quiz.preguntas.preguntas;
        } else if (Array.isArray(quiz.preguntas)) {
          this.items = quiz.preguntas;
        } else if (quiz.preguntas?.items) {
          this.items = quiz.preguntas.items;
        } else {
          this.items = [];
        }

        // Filtrar temporalmente las preguntas de tipo respuesta_corta
        this.itemsFiltrados = this.items.filter(it => it?.tipo === 'opcion_multiple' || it?.tipo === 'vf');
        console.log('Items procesados (filtrados):', this.itemsFiltrados);
        this.loading = false;
        
        // Inicializar respuestas vacías SOLO para las preguntas filtradas
        this.respuestas = {};
        for (let i = 0; i < this.itemsFiltrados.length; i++) {
          this.respuestas[`pregunta_${i}`] = null;
        }

        this.inicializarTimer();
        this.intentoEnCurso = this.quiz.puede_intentar !== false;
      },
      error: (error) => {
        console.error('Error al cargar evaluación:', error);
        this.loading = false;
        alert('Error al cargar la evaluación');
      }
    });
  }
  
  enviarRespuestas() {
    if (this.enviando) return;
    if (this.tiempoAgotado) {
      alert('El tiempo para esta evaluación se ha agotado. Si aún tienes intentos disponibles, vuelve a abrir la evaluación para iniciar un nuevo intento.');
      return;
    }
    
    // Validar que todas las preguntas soportadas estén respondidas
    const preguntasSinResponder = [];
    for (let i = 0; i < this.itemsFiltrados.length; i++) {
      const key = `pregunta_${i}`;
      if (this.respuestas[key] === null || this.respuestas[key] === undefined || this.respuestas[key] === '') {
        preguntasSinResponder.push(i + 1);
      }
    }
    
    if (preguntasSinResponder.length > 0) {
      alert(`Por favor responde todas las preguntas. Faltan: ${preguntasSinResponder.join(', ')}`);
      return;
    }
    
    // Confirmar envío
    if (!confirm('¿Estás seguro de que quieres enviar tus respuestas? No podrás modificarlas después.')) {
      return;
    }
    
    this.enviando = true;
    
    this.api.responderQuiz(this.quiz.id, this.respuestas).subscribe({
      next: (resultado) => {
        this.enviando = false;
        alert(`¡Evaluación enviada exitosamente! Tu calificación es: ${resultado.score}/100`);
        this.intentoEnCurso = false;
        this.volver();
      },
      error: (error) => {
        this.enviando = false;
        console.error('Error al enviar respuestas:', error);
        const mensaje = error.error?.detail || 'Error al enviar las respuestas';
        alert(mensaje);
      }
    });
  }
  
  ngOnDestroy(): void {
    this.limpiarTimer();
    this.intentoEnCurso = false;
  }

  private inicializarTimer(): void {
    this.limpiarTimer();
    this.tiempoAgotado = false;

    if (!this.quiz || !this.quiz.tiempo_limite_minutos || this.quiz.tiempo_limite_minutos <= 0) {
      this.tiempoRestante = null;
      return;
    }

    this.tiempoRestante = this.quiz.tiempo_limite_minutos * 60;
    this.countdownId = setInterval(() => {
      if (this.tiempoRestante == null) return;
      this.tiempoRestante = this.tiempoRestante - 1;
      if (this.tiempoRestante <= 0) {
        this.tiempoRestante = 0;
        this.tiempoAgotado = true;
        this.intentoEnCurso = false;
        this.limpiarTimer();
      }
    }, 1000);
  }

  private limpiarTimer(): void {
    if (this.countdownId) {
      clearInterval(this.countdownId);
      this.countdownId = null;
    }
  }

  formatoTiempo(totalSegundos: number | null): string {
    if (totalSegundos == null || totalSegundos <= 0) {
      return '00:00';
    }
    const minutos = Math.floor(totalSegundos / 60);
    const segundos = totalSegundos % 60;
    const mm = minutos.toString().padStart(2, '0');
    const ss = segundos.toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }

  @HostListener('window:beforeunload', ['$event'])
  manejarBeforeUnload(event: BeforeUnloadEvent) {
    if (this.intentoEnCurso) {
      event.preventDefault();
      event.returnValue = 'Tienes un intento en curso. Si sales de la página, este intento se dará por utilizado y tendrás que usar otro para volver a ingresar.';
    }
  }

  volver(){
    this.router.navigateByUrl('/dashboard-estudiante/evaluaciones');
  }
}
