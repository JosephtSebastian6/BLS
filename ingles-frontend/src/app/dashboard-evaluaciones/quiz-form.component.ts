import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { QuizzesService, QuizCreate, QuizResponse } from '../services/quizzes.service';

@Component({
  selector: 'app-quiz-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <div class="dashboard-container">
    <!-- Header Section -->
    <div class="dashboard-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="dashboard-title">{{ id ? '✏️ Editar Evaluación' : '➕ Nueva Evaluación' }}</h1>
          <p class="dashboard-subtitle">{{ id ? 'Modifica los detalles y preguntas de la evaluación' : 'Crea una nueva evaluación para tus estudiantes' }}</p>
        </div>
        <button class="btn-secondary" (click)="volver()">
          <span class="btn-icon">←</span>
          Volver
        </button>
      </div>
    </div>

    <!-- Main Form -->
    <div class="form-container">
      <form (ngSubmit)="guardar()" #frm="ngForm">
        <!-- Basic Info Card -->
        <div class="info-card">
          <div class="card-header">
            <h3 class="card-title">📋 Información Básica</h3>
          </div>
          <div class="card-content">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">
                  <span class="label-text">🎯 Unidad ID</span>
                  <div class="input-wrapper">
                    <input 
                      type="number" 
                      required 
                      [(ngModel)]="form.unidad_id" 
                      name="unidad_id"
                      class="form-input"
                      placeholder="Ej: 1"
                    />
                    <span class="input-icon">🔢</span>
                  </div>
                </label>
              </div>
              <div class="form-group">
                <label class="form-label">
                  <span class="label-text">📝 Título</span>
                  <div class="input-wrapper">
                    <input 
                      type="text" 
                      required 
                      [(ngModel)]="form.titulo" 
                      name="titulo"
                      class="form-input"
                      placeholder="Nombre de la evaluación"
                    />
                    <span class="input-icon">✏️</span>
                  </div>
                </label>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">
                <span class="label-text">📄 Descripción</span>
                <div class="textarea-wrapper">
                  <textarea 
                    rows="3" 
                    [(ngModel)]="form.descripcion" 
                    name="descripcion"
                    class="form-textarea"
                    placeholder="Describe el propósito y contenido de esta evaluación..."
                  ></textarea>
                </div>
              </label>
            </div>
          </div>
        </div>

        <!-- Questions Section -->
        <div class="questions-card">
          <div class="card-header">
            <h3 class="card-title">❓ Preguntas</h3>
            <div class="header-actions">
              <div class="question-type-selector">
                <select [(ngModel)]="nuevoTipo" name="nuevoTipo" class="type-select">
                  <option value="opcion_multiple">📊 Opción múltiple</option>
                  <option value="vf">✅ Verdadero/Falso</option>
                  <option value="respuesta_corta">📝 Respuesta corta</option>
                  <option value="audio_respuesta_corta">🎧 Audio + respuesta corta</option>
                </select>
              </div>
              <button type="button" class="btn-primary" (click)="onAgregarClick($event)">
                <span class="btn-icon">➕</span>
                Agregar Pregunta
              </button>
            </div>
          </div>

          <!-- Empty State -->
          <div *ngIf="!items.length" class="empty-questions">
            <div class="empty-icon">❓</div>
            <h4 class="empty-title">Sin preguntas aún</h4>
            <p class="empty-description">Comienza agregando la primera pregunta para tu evaluación</p>
            <button type="button" class="btn-primary" (click)="onAgregarClick($event)">
              <span class="btn-icon">➕</span>
              Agregar Primera Pregunta
            </button>
          </div>

          <!-- Questions List -->
          <div class="questions-list" *ngIf="items.length > 0">
            <div class="question-item" *ngFor="let it of items; let i = index">
              <div class="question-header">
                <div class="question-info">
                  <span class="question-number">#{{ i+1 }}</span>
                  <span class="question-type">{{ etiquetaTipo(it.tipo) }}</span>
                </div>
                <div class="question-actions">
                  <button type="button" class="action-btn move-btn" (click)="mover(i,-1)" [disabled]="i===0" title="Mover arriba">
                    <span class="action-icon">⬆️</span>
                  </button>
                  <button type="button" class="action-btn move-btn" (click)="mover(i,1)" [disabled]="i===items.length-1" title="Mover abajo">
                    <span class="action-icon">⬇️</span>
                  </button>
                  <button type="button" class="action-btn delete-btn" (click)="eliminarPregunta(i)" title="Eliminar pregunta">
                    <span class="action-icon">🗑️</span>
                  </button>
                </div>
              </div>

              <div class="question-content">
                <div class="form-group">
                  <label class="form-label">
                    <span class="label-text">📝 Enunciado</span>
                    <input 
                      type="text" 
                      [(ngModel)]="it.enunciado" 
                      name="enunciado_{{i}}" 
                      required 
                      class="form-input"
                      placeholder="Escribe la pregunta aquí..."
                    />
                  </label>
                </div>

                <div class="form-group small">
                  <label class="form-label">
                    <span class="label-text">🎯 Puntaje</span>
                    <input 
                      type="number" 
                      min="0" 
                      step="1" 
                      [(ngModel)]="it.puntaje" 
                      name="puntaje_{{i}}"
                      class="form-input"
                      placeholder="1"
                    />
                  </label>
                </div>

                <!-- Imagen opcional para cualquier tipo de pregunta -->
                <div class="form-group">
                  <label class="form-label">
                    <span class="label-text">🖼 Imagen (opcional)</span>
                    <input
                      type="file"
                      accept="image/*"
                      (change)="onImageFileSelected($event, i)"
                      class="form-input"
                    />
                  </label>
                  <div *ngIf="it._imageUploading" class="upload-hint">
                    Subiendo imagen...
                  </div>
                  <div *ngIf="it.imagen_url && !it._imageUploading" class="upload-hint" style="margin-top:0.5rem;">
                    <img
                      [src]="it.imagen_url"
                      alt="Imagen de la pregunta"
                      style="max-width:260px;max-height:260px;width:100%;height:auto;object-fit:contain;border-radius:8px;display:block;margin:0.5rem auto;"
                    />
                  </div>
                </div>

                <!-- Question Type Specific Content -->
                <ng-container [ngSwitch]="it.tipo">
                  <!-- Multiple Choice -->
                  <div *ngSwitchCase="'opcion_multiple'" class="options-section">
                    <h5 class="options-title">📊 Opciones de respuesta</h5>
                    <div class="options-list">
                      <div class="option-item" *ngFor="let op of it.opciones; let j = index">
                        <div class="option-input">
                          <input 
                            type="text" 
                            [(ngModel)]="op.texto" 
                            name="op_texto_{{i}}_{{j}}" 
                            placeholder="Texto de la opción"
                            class="form-input"
                          />
                        </div>
                        <label class="option-checkbox">
                          <input 
                            type="checkbox" 
                            [(ngModel)]="op.correcta" 
                            name="op_ok_{{i}}_{{j}}"
                            class="checkbox-input"
                          />
                          <span class="checkbox-label">✅ Correcta</span>
                        </label>
                        <button type="button" class="remove-option-btn" (click)="eliminarOpcion(i,j)">
                          <span class="btn-icon">🗑️</span>
                        </button>
                      </div>
                    </div>
                    <button type="button" class="add-option-btn" (click)="agregarOpcion(i)">
                      <span class="btn-icon">➕</span>
                      Agregar Opción
                    </button>
                  </div>

                  <!-- True/False -->
                  <div *ngSwitchCase="'vf'" class="options-section">
                    <div class="form-group">
                      <label class="form-label">
                        <span class="label-text">✅ Respuesta correcta</span>
                        <select [(ngModel)]="it.respuesta" name="vf_resp_{{i}}" class="form-select">
                          <option [ngValue]="true">✅ Verdadero</option>
                          <option [ngValue]="false">❌ Falso</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <!-- Short Answer -->
                  <div *ngSwitchCase="'respuesta_corta'" class="options-section">
                    <div class="form-group">
                      <label class="form-label">
                        <span class="label-text">📝 Respuesta esperada (opcional)</span>
                        <input 
                          type="text" 
                          [(ngModel)]="it.respuesta" 
                          name="rc_resp_{{i}}" 
                          placeholder="Texto de referencia para la corrección"
                          class="form-input"
                        />
                      </label>
                    </div>
                  </div>

                  <!-- Audio + Short Answer -->
                  <div *ngSwitchCase="'audio_respuesta_corta'" class="options-section">
                    <div class="form-group">
                      <label class="form-label">
                        <span class="label-text">Archivo de audio</span>
                        <input
                          type="file"
                          accept="audio/*"
                          (change)="onAudioFileSelected($event, i)"
                          class="form-input"
                        />
                      </label>
                      <div *ngIf="it._audioUploading" class="upload-hint">
                        Subiendo audio...
                      </div>
                      <div *ngIf="it.audio_url && !it._audioUploading" class="upload-hint">
                        <audio [src]="it.audio_url" controls style="width:100%;"></audio>
                      </div>
                    </div>
                    <div class="form-group">
                      <label class="form-label">
                        <span class="label-text">URL del audio (opcional)</span>
                        <input
                          type="text"
                          [(ngModel)]="it.audio_url"
                          name="audio_url_{{i}}"
                          placeholder="https://.../mi-audio.mp3"
                          class="form-input"
                        />
                      </label>
                    </div>
                    <div class="form-group">
                      <label class="form-label">
                        <span class="label-text">📝 Respuesta esperada (opcional)</span>
                        <input
                          type="text"
                          [(ngModel)]="it.respuesta"
                          name="audio_rc_resp_{{i}}"
                          placeholder="Texto de referencia para la corrección manual"
                          class="form-input"
                        />
                      </label>
                    </div>
                  </div>
                </ng-container>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="form-actions">
          <button type="button" class="btn-secondary" (click)="volver()">
            <span class="btn-icon">❌</span>
            Cancelar
          </button>
          <button type="submit" class="btn-primary large">
            <span class="btn-icon">{{ id ? '💾' : '✨' }}</span>
            {{ id ? 'Guardar Cambios' : 'Crear Evaluación' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Floating Action Buttons -->
    <button type="button" class="fab" (click)="onAgregarClick($event)" title="Agregar pregunta">
      <span class="fab-icon">➕</span>
    </button>
    <button type="button" class="fab-save" (click)="guardar()" title="Guardar evaluación">
      <span class="fab-icon">💾</span>
    </button>
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

    .btn-secondary {
      background: rgba(255, 255, 255, 0.9);
      color: var(--text-primary);
      border: 2px solid rgba(102, 126, 234, 0.2);
      border-radius: 15px;
      padding: 1rem 2rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .btn-secondary:hover {
      background: var(--primary-color);
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
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

    .btn-primary.large {
      padding: 1.2rem 2rem;
      font-size: 1.1rem;
      min-width: 200px;
      justify-content: center;
    }

    .btn-icon {
      font-size: 1.2rem;
    }

    /* Form Container */
    .form-container {
      max-width: 1000px;
      margin: 0 auto;
    }

    /* Info Card */
    .info-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      margin-bottom: 2rem;
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(255, 255, 255, 0.2);
      overflow: hidden;
    }

    .questions-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      margin-bottom: 2rem;
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(255, 255, 255, 0.2);
      overflow: hidden;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 2rem;
      background: rgba(248, 250, 252, 0.8);
      border-bottom: 1px solid rgba(226, 232, 240, 0.5);
    }

    .card-title {
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .question-type-selector {
      position: relative;
    }

    .type-select {
      padding: 0.8rem 1rem;
      border: 2px solid rgba(102, 126, 234, 0.1);
      border-radius: 10px;
      background: white;
      color: var(--text-primary);
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition);
    }

    .type-select:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .card-content {
      padding: 2rem;
    }

    /* Form Elements */
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group.small {
      max-width: 200px;
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

    .input-wrapper {
      position: relative;
    }

    .form-input {
      width: 100%;
      padding: 1rem 3rem 1rem 1rem;
      border: 2px solid rgba(102, 126, 234, 0.1);
      border-radius: 12px;
      font-size: 1rem;
      background: white;
      color: var(--text-primary);
      transition: var(--transition);
    }

    .form-input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .input-icon {
      position: absolute;
      right: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-secondary);
      font-size: 1.2rem;
    }

    .textarea-wrapper {
      position: relative;
    }

    .form-textarea {
      width: 100%;
      padding: 1rem;
      border: 2px solid rgba(102, 126, 234, 0.1);
      border-radius: 12px;
      font-size: 1rem;
      background: white;
      color: var(--text-primary);
      transition: var(--transition);
      resize: vertical;
      min-height: 100px;
    }

    .form-textarea:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-select {
      width: 100%;
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

    /* Empty State */
    .empty-questions {
      text-align: center;
      padding: 4rem 2rem;
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
      margin: 0 0 2rem 0;
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
    }

    /* Questions List */
    .questions-list {
      padding: 2rem;
    }

    .question-item {
      background: rgba(248, 250, 252, 0.8);
      border-radius: 15px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      border: 1px solid rgba(226, 232, 240, 0.5);
      transition: var(--transition);
    }

    .question-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    }

    .question-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px dashed rgba(226, 232, 240, 0.7);
    }

    .question-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .question-number {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-weight: 700;
      font-size: 0.9rem;
    }

    .question-type {
      background: rgba(102, 126, 234, 0.1);
      color: var(--primary-color);
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .question-actions {
      display: flex;
      gap: 0.5rem;
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

    .move-btn {
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
    }

    .move-btn:hover:not(:disabled) {
      background: #3b82f6;
      color: white;
      transform: translateY(-2px);
    }

    .move-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .delete-btn {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }

    .delete-btn:hover {
      background: #ef4444;
      color: white;
      transform: translateY(-2px);
    }

    .action-icon {
      font-size: 1rem;
    }

    .question-content {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    /* Options Section */
    .options-section {
      margin-top: 1rem;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.7);
      border-radius: 12px;
      border: 1px solid rgba(226, 232, 240, 0.3);
    }

    .options-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 1rem 0;
    }

    .options-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .option-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: white;
      border-radius: 10px;
      border: 1px solid rgba(226, 232, 240, 0.5);
    }

    .option-input {
      flex: 1;
    }

    .option-checkbox {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      white-space: nowrap;
    }

    .checkbox-input {
      width: auto;
      margin: 0;
    }

    .checkbox-label {
      font-weight: 600;
      color: var(--success-color);
    }

    .remove-option-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: var(--transition);
    }

    .remove-option-btn:hover {
      background: #ef4444;
      color: white;
    }

    .add-option-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem;
      background: rgba(102, 126, 234, 0.1);
      color: var(--primary-color);
      border: 2px dashed rgba(102, 126, 234, 0.3);
      border-radius: 10px;
      cursor: pointer;
      transition: var(--transition);
      font-weight: 600;
    }

    .add-option-btn:hover {
      background: var(--primary-color);
      color: white;
      border-style: solid;
    }

    /* Form Actions */
    .form-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2rem;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: var(--border-radius);
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    /* Floating Action Buttons */
    .fab {
      position: fixed;
      right: 2rem;
      bottom: 2rem;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
      border: none;
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
      cursor: pointer;
      transition: var(--transition);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .fab:hover {
      transform: translateY(-3px);
      box-shadow: 0 15px 40px rgba(102, 126, 234, 0.5);
    }

    .fab-save {
      position: fixed;
      right: 2rem;
      bottom: 8rem;
      width: 60px;
      height: 60px;
      border-radius: 15px;
      background: var(--success-color);
      color: white;
      border: none;
      box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4);
      cursor: pointer;
      transition: var(--transition);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .fab-save:hover {
      transform: translateY(-3px);
      box-shadow: 0 15px 40px rgba(16, 185, 129, 0.5);
    }

    .fab-icon {
      font-size: 1.5rem;
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

      .form-grid {
        grid-template-columns: 1fr;
      }

      .question-header {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }

      .option-item {
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
      }

      .form-actions {
        flex-direction: column;
        gap: 1rem;
      }

      .fab {
        right: 1rem;
        bottom: 1.5rem;
      }
      
      .fab-save {
        right: 1rem;
        bottom: 6rem;
      }
    }
  `]
})
export class QuizFormComponent implements OnInit {
  id: number | null = null;
  form: QuizCreate = { unidad_id: 0, titulo: '', descripcion: '', preguntas: null };
  // Editor visual: permitimos opcion_multiple, vf, respuesta_corta y audio_respuesta_corta
  nuevoTipo: 'opcion_multiple' | 'vf' | 'respuesta_corta' | 'audio_respuesta_corta' = 'opcion_multiple';
  items: any[] = [];
  constructor(private api: QuizzesService, private route: ActivatedRoute, private router: Router) {}
  ngOnInit(){
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.id = Number(idParam);
      this.api.obtener(this.id).subscribe((q: QuizResponse)=>{
        this.form = { unidad_id: q.unidad_id, titulo: q.titulo, descripcion: q.descripcion ?? '', preguntas: q.preguntas ?? null };
        const incoming = q.preguntas && (q.preguntas as any).items ? (q.preguntas as any).items : [];
        this.items = Array.isArray(incoming) ? incoming : [];
      });
    }
  }
  guardar(){
    // Serializar a estructura { items: [...] }
    this.form.preguntas = { items: this.items };
    const req = this.id ? this.api.actualizar(this.id, this.form) : this.api.crear(this.form);
    req.subscribe((r)=>{
      this.router.navigate([this._listUrl()]);
    });
  }
  volver(){ this.router.navigate([this._listUrl()]); }

  private _listUrl(): string {
    const seg = this.router.url.split('/')[1] || 'dashboard-profesor';
    return `/${seg}/quizzes`;
  }

  etiquetaTipo(t: string){
    if (t === 'opcion_multiple') return 'Opción múltiple';
    if (t === 'vf') return 'Verdadero/Falso';
    if (t === 'respuesta_corta') return 'Respuesta corta';
    if (t === 'audio_respuesta_corta') return 'Audio + respuesta corta';
    return t;
  }

  agregarPregunta(){
    if (this.nuevoTipo === 'opcion_multiple') {
      this.items.push({ tipo: 'opcion_multiple', enunciado: '', puntaje: 1, opciones: [ { texto: '', correcta: false }, { texto: '', correcta: false } ] });
    } else if (this.nuevoTipo === 'vf') {
      this.items.push({ tipo: 'vf', enunciado: '', puntaje: 1, respuesta: true });
    } else if (this.nuevoTipo === 'respuesta_corta') {
      this.items.push({ tipo: 'respuesta_corta', enunciado: '', puntaje: 1, respuesta: '' });
    } else if (this.nuevoTipo === 'audio_respuesta_corta') {
      this.items.push({ tipo: 'audio_respuesta_corta', enunciado: '', puntaje: 1, audio_url: '', respuesta: '' });
    }
    // Forzar CD en algunos entornos
    this.items = [...this.items];
  }
  eliminarPregunta(i: number){ this.items.splice(i,1); }
  mover(i: number, dir: number){
    const j = i + dir; if(j < 0 || j >= this.items.length) return; const tmp = this.items[i]; this.items[i] = this.items[j]; this.items[j] = tmp;
  }
  agregarOpcion(i: number){ this.items[i].opciones.push({ texto: '', correcta: false }); }
  eliminarOpcion(i: number, j: number){ this.items[i].opciones.splice(j,1); }

  onAgregarClick(ev: Event){ ev.preventDefault(); ev.stopPropagation(); this.agregarPregunta(); }

  onAudioFileSelected(ev: Event, index: number) {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];
    if (!file) {
      return;
    }
    const it = this.items[index];
    if (!it) {
      return;
    }
    it._audioUploading = true;
    this.api.subirAudioPregunta(file).subscribe({
      next: (res: any) => {
        try {
          const base = this.api.getApiBase();
          const apiRoot = base.replace(/\/auth$/, '');
          const owner = res.owner || '';
          const filename = res.filename;
          it.audio_url = owner ? `${apiRoot}/auth/quizzes/audio/${owner}/${filename}` : `${apiRoot}/auth/quizzes/audio/${filename}`;
        } catch (e) {
          console.error('Error construyendo URL de audio', e);
        }
        it._audioUploading = false;
      },
      error: (err) => {
        console.error('Error subiendo audio', err);
        alert('No se pudo subir el audio. Intenta nuevamente.');
        it._audioUploading = false;
      }
    });
  }

  onImageFileSelected(ev: Event, index: number) {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];
    if (!file) {
      return;
    }
    const it = this.items[index];
    if (!it) {
      return;
    }
    it._imageUploading = true;
    this.api.subirImagenPregunta(file).subscribe({
      next: (res: any) => {
        try {
          const base = this.api.getApiBase();
          const apiRoot = base.replace(/\/auth$/, '');
          const owner = res.owner || '';
          const filename = res.filename;
          it.imagen_url = owner ? `${apiRoot}/auth/quizzes/images/${owner}/${filename}` : `${apiRoot}/auth/quizzes/images/${filename}`;
        } catch (e) {
          console.error('Error construyendo URL de imagen', e);
        }
        it._imageUploading = false;
      },
      error: (err) => {
        console.error('Error subiendo imagen', err);
        alert('No se pudo subir la imagen. Intenta nuevamente.');
        it._imageUploading = false;
      }
    });
  }
}
