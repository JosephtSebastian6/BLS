import { Component, OnInit } from '@angular/core';
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
      
      <!-- Mostrar si ya fue respondido -->
      <div *ngIf="quiz.ya_respondido" class="alert alert-info">
        <h3>✅ Evaluación completada</h3>
        <p>Ya has respondido esta evaluación el {{ quiz.fecha_respuesta | date:'short' }}</p>
        <p *ngIf="quiz.calificacion !== null"><strong>Calificación: {{ quiz.calificacion }}/100</strong></p>
      </div>

      <!-- Formulario de respuestas -->
      <div *ngIf="!quiz.ya_respondido">
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
          <button type="button" class="btn-primary" [disabled]="enviando" (click)="enviarRespuestas()" onclick="console.log('Botón enviar clickeado')">
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
    .form-actions{margin-top:1.5rem;text-align:center}
    .btn-primary{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;border-radius:10px;padding:.75rem 1.5rem;cursor:pointer;font-size:1rem;pointer-events:auto !important}
    .btn-primary:disabled{opacity:0.6;cursor:not-allowed}
  `]
})
export class EvaluacionRendirComponent implements OnInit {
  quiz!: QuizDetalleEstudiante;
  respuestas: { [key: string]: any } = {};
  items: any[] = [];
  // Solo los items que vamos a preguntar (sin respuesta_corta por ahora)
  itemsFiltrados: any[] = [];
  loading = false;
  enviando = false;
  
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
  
  volver(){
    this.router.navigateByUrl('/dashboard-estudiante/evaluaciones');
  }
}
