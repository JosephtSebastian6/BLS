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
  templateUrl: './mis-profes.component.html',
  styleUrls: ['./mis-profes.component.css']
})
export class MisProfesComponent implements OnInit {
  profesores: Profesor[] = [];
  resumenMap: Record<string, { grupos_creados: number; grupos_estimados?: number; estudiantes_asignados: number }> = {};
  todosEstudiantes: Estudiante[] = [];
  estudiantesAsignados: Estudiante[] = [];
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

  // Lista de estudiantes filtrada por unidad seleccionada en el modal (si la opción está activa)
  get estudiantesParaCrearGrupo(): Estudiante[] {
    if (!this.soloEstudiantesDeUnidad || !this.formGrupo.unidad_id) return this.todosEstudiantes;
    // Si no tenemos un endpoint batch, simplificamos: confiamos en que el backend valide al crear el grupo.
    // Aquí podríamos filtrar por una caché local (si existiera). Por ahora devolvemos todos para no hacer N requests.
    return this.todosEstudiantes;
  }

  crearGrupo(): void {
    if (!this.formGrupo.profesor_username || !this.formGrupo.unidad_id) {
      alert('Selecciona profesor y unidad');
      return;
    }
    this.creandoGrupo = true;
    // Consumir endpoint simplificado de grupos por unidad
    this.gruposSvc.crearGrupoUnidad({
      profesor_username: this.formGrupo.profesor_username,
      unidad_id: this.formGrupo.unidad_id!,
      estudiantes: this.formGrupo.estudiantes,
    }).subscribe({
      next: () => {
        this.creandoGrupo = false;
        this.mostrarModalGrupo = false;
        alert('Grupo creado');
        this.cargarResumenes();
      },
      error: (e) => {
        console.error(e);
        this.creandoGrupo = false;
        alert(e?.error?.detail || 'No se pudo crear el grupo');
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
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get<Estudiante[]>(`${this.apiUrl}/estudiantes`, { headers })
      .subscribe({
        next: (estudiantes) => {
          this.todosEstudiantes = estudiantes;
        },
        error: (error) => {
          console.error('Error cargando estudiantes:', error);
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
