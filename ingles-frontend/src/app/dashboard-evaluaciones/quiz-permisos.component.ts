import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { QuizzesService } from '../services/quizzes.service';
import { EmpresaGruposService } from '../services/empresa-grupos.service';

@Component({
  selector: 'app-quiz-permisos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <div class="card">
    <div class="card-header">
      <h2>Gestionar Permisos de Evaluación #{{ quizId }}</h2>
      <button class="btn-outline" (click)="volver()">Volver</button>
    </div>
    <div class="card-body">
      <div class="info-box">
        <p>🔐 Gestiona qué estudiantes pueden acceder a esta evaluación.</p>
        <p><strong>Por defecto:</strong> Todos los estudiantes con la unidad habilitada pueden acceder.</p>
        <p><strong>Deshabilitar:</strong> El estudiante NO verá esta evaluación en su lista.</p>
      </div>

      <div class="search-box">
        <label>
          Buscar estudiante por username
          <input type="text" [(ngModel)]="searchUsername" placeholder="Ej: sebastian" />
        </label>
        <button class="btn" (click)="buscarEstudiante()">Buscar</button>
      </div>

      <div *ngIf="mensaje" class="mensaje" [class.success]="!mensajeError" [class.error]="mensajeError">
        {{ mensaje }}
      </div>

      <div *ngIf="estudianteActual" class="estudiante-card">
        <div class="estudiante-info">
          <h3>{{ estudianteActual.nombres }} {{ estudianteActual.apellidos }}</h3>
          <p>Username: <strong>{{ estudianteActual.username }}</strong></p>
          <p>Email: {{ estudianteActual.email }}</p>
        </div>
        <div class="permiso-actions">
          <button 
            class="btn-toggle" 
            [class.habilitado]="estudianteActual.permisoHabilitado"
            [class.deshabilitado]="!estudianteActual.permisoHabilitado"
            (click)="togglePermiso(estudianteActual.username)">
            {{ estudianteActual.permisoHabilitado ? '✓ Habilitado' : '✗ Deshabilitado' }}
          </button>
        </div>
      </div>

      <h3>Permisos Configurados (Solo Deshabilitados)</h3>
      <div *ngIf="permisosConfigurados.length === 0" class="empty">
        No hay permisos deshabilitados. Todos los estudiantes pueden acceder por defecto.
      </div>
      <ul class="permisos-list">
        <li *ngFor="let p of permisosConfigurados">
          <span>Username: <strong>{{ p.username }}</strong></span>
          <span [class.habilitado]="p.habilitado" [class.deshabilitado]="!p.habilitado">
            {{ p.habilitado ? 'Habilitado' : 'Deshabilitado' }}
          </span>
          <button class="btn-sm" (click)="togglePermiso(p.username)">Toggle</button>
        </li>
      </ul>
    </div>
  </div>
  `,
  styles: [`
    .card{max-width:900px;margin:2rem auto;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.06)}
    .card-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid rgba(0,0,0,.06)}
    .btn{background:linear-gradient(135deg,var(--primary,#667eea),var(--secondary,#764ba2));color:#fff;border:none;border-radius:10px;padding:.6rem .9rem;cursor:pointer}
    .btn-outline{border:1px solid #cbd5e1;background:#fff;color:#1f2937;border-radius:10px;padding:.6rem .9rem;cursor:pointer}
    .card-body{padding:1rem 1.25rem}
    .info-box{background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:1rem;margin-bottom:1.5rem}
    .info-box p{margin:.5rem 0;color:#0c4a6e}
    .search-box{display:flex;gap:12px;align-items:flex-end;margin-bottom:1.5rem}
    .search-box label{flex:1}
    input{width:100%;border:1px solid #e5e7eb;border-radius:10px;padding:.6rem .7rem;background:#fff}
    .mensaje{padding:.8rem 1rem;border-radius:10px;margin-bottom:1rem}
    .mensaje.success{background:#d1fae5;color:#065f46;border:1px solid #6ee7b7}
    .mensaje.error{background:#fee2e2;color:#991b1b;border:1px solid #fca5a5}
    .estudiante-card{border:1px solid #e5e7eb;border-radius:12px;padding:1rem;margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center}
    .estudiante-info h3{margin:0 0 .5rem;color:#1f2937}
    .estudiante-info p{margin:.25rem 0;color:#6b7280}
    .btn-toggle{padding:.7rem 1.2rem;border-radius:10px;border:2px solid;cursor:pointer;font-weight:600;min-width:140px}
    .btn-toggle.habilitado{background:#d1fae5;color:#065f46;border-color:#6ee7b7}
    .btn-toggle.deshabilitado{background:#fee2e2;color:#991b1b;border-color:#fca5a5}
    .permisos-list{list-style:none;padding:0}
    .permisos-list li{display:flex;gap:12px;align-items:center;padding:.7rem;border-bottom:1px dashed #e5e7eb}
    .permisos-list li span.habilitado{color:#16a34a;font-weight:600}
    .permisos-list li span.deshabilitado{color:#dc2626;font-weight:600}
    .btn-sm{padding:.4rem .7rem;border-radius:8px;border:1px solid #cbd5e1;background:#fff;cursor:pointer}
    .empty{padding:1rem;color:#6b7280;text-align:center}
  `]
})
export class QuizPermisosComponent implements OnInit {
  quizId!: number;
  searchUsername: string = '';
  estudianteActual: any = null;
  permisosConfigurados: Array<{ username: string; habilitado: boolean }> = [];
  mensaje: string = '';
  mensajeError: boolean = false;

  constructor(
    private quizzesService: QuizzesService,
    private gruposService: EmpresaGruposService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.quizId = Number(this.route.snapshot.paramMap.get('id'));
  }

  buscarEstudiante() {
    if (!this.searchUsername.trim()) {
      this.mostrarMensaje('Ingresa un username', true);
      return;
    }

    // Buscar estudiante en la lista de estudiantes
    this.gruposService.listarEstudiantes().subscribe({
      next: (estudiantes) => {
        const estudiante = estudiantes.find(e => 
          e.username?.toLowerCase() === this.searchUsername.trim().toLowerCase()
        );
        
        if (estudiante) {
          this.estudianteActual = estudiante;
          this.verificarPermisoActual(estudiante.username);
        } else {
          this.mostrarMensaje('Estudiante no encontrado', true);
          this.estudianteActual = null;
        }
      },
      error: () => {
        this.mostrarMensaje('Error al buscar estudiante', true);
      }
    });
  }

  verificarPermisoActual(username: string) {
    this.quizzesService.listarPermisosQuizEstudiante(username).subscribe({
      next: (permisos) => {
        const permiso = permisos.find(p => p.quiz_id === this.quizId);
        // Si no existe permiso = habilitado por defecto
        this.estudianteActual.permisoHabilitado = permiso ? permiso.habilitado : true;
      },
      error: () => {
        // Si hay error, asumir habilitado por defecto
        this.estudianteActual.permisoHabilitado = true;
      }
    });
  }

  togglePermiso(username: string) {
    this.quizzesService.togglePermisoQuizEstudiante(username, this.quizId).subscribe({
      next: (response) => {
        this.mostrarMensaje(response.mensaje, false);
        
        // Actualizar estado local
        if (this.estudianteActual && this.estudianteActual.username === username) {
          this.estudianteActual.permisoHabilitado = response.habilitado;
        }
        
        // Recargar lista de permisos configurados
        this.cargarPermisosConfigurados();
      },
      error: (err) => {
        this.mostrarMensaje(err?.error?.detail || 'Error al cambiar permiso', true);
      }
    });
  }

  cargarPermisosConfigurados() {
    // Aquí podrías cargar todos los estudiantes y verificar sus permisos
    // Por ahora solo mostramos un mensaje
    this.mensaje = 'Permiso actualizado correctamente';
  }

  mostrarMensaje(msg: string, esError: boolean = false) {
    this.mensaje = msg;
    this.mensajeError = esError;
    setTimeout(() => {
      this.mensaje = '';
    }, 3000);
  }

  volver() {
    const seg = this.router.url.split('/')[1] || 'dashboard-profesor';
    this.router.navigate([`/${seg}/quizzes`]);
  }
}
