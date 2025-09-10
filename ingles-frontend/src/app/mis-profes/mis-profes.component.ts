import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MisProfesService, Profesor } from './mis-profes.service';
import { EmpresaGruposService } from '../services/empresa-grupos.service';

interface Estudiante {
  identificador: number;
  username: string;
  nombres: string;
  apellidos: string;
  email: string;
  tipo_usuario: string;
}

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
  unidades: Array<{ id: number; nombre: string }> = [];
  cargandoProfesores = false;
  cargandoUnidades = false;
  cargandoEstudiantes = false;
  procesandoAsignacion = false;
  showTabla = false;
  private apiUrl = 'http://localhost:8000/auth';
  gruposMap: Record<string, any[] | null> = {};
  verGruposOpen: Record<string, boolean> = {};

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
      next: (u) => { this.unidades = u || []; this.cargandoUnidades = false; },
      error: (e) => { console.error('Error cargando unidades', e); this.unidades = []; this.cargandoUnidades = false; }
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
        next: (u) => { this.unidades = u || []; this.cargandoUnidades = false; this.formGrupo.unidad_id = this.unidades?.[0]?.id ?? null; },
        error: () => { this.cargandoUnidades = false; }
      });
    }
    this.formGrupo.estudiantes = [];
    this.formGrupo.unidad_id = this.unidades?.[0]?.id ?? null;
    this.mostrarModalGrupo = true;
  }

  cerrarModalGrupo(): void {
    this.mostrarModalGrupo = false;
  }

  toggleSeleccionEstudiante(username: string): void {
    const idx = this.formGrupo.estudiantes.indexOf(username);
    if (idx >= 0) this.formGrupo.estudiantes.splice(idx, 1);
    else this.formGrupo.estudiantes.push(username);
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

  // Cargar/alternar grupos (clases) por profesor dentro de la clase
  toggleVerGrupos(profesor: Profesor): void {
    const key = profesor.username;
    const isOpen = !!this.verGruposOpen[key];
    if (!isOpen && !this.gruposMap[key]) {
      // Cargar por primera vez
      this.misProfesService.getClases(key).subscribe({
        next: (clases: any[]) => {
          const mapped = (clases || []).map((c: any) => {
            let unidadNombre = '';
            if (typeof c.tema === 'string') {
              const m = c.tema.match(/Unidad\s*(\d+)/i);
              if (m && m[1]) {
                const uid = Number(m[1]);
                const found = this.unidades.find(u => u.id === uid);
                if (found) unidadNombre = found.nombre;
              }
            }
            return {
              id: c.id,
              tema: c.tema,
              unidad: unidadNombre,
              estudiantes: c.estudiantes || []
            };
          });
          this.gruposMap[key] = mapped;
          this.verGruposOpen[key] = true;
        },
        error: (e) => {
          console.error('Error cargando grupos', e);
          this.gruposMap[key] = [];
          this.verGruposOpen[key] = true;
        }
      });
    } else {
      // Solo alternar visibilidad
      this.verGruposOpen[key] = !isOpen;
    }
  }

  // Eliminar grupo (clase) con confirmación
  deleteGrupo(profesor: Profesor, claseId: number): void {
    if (!claseId) return;
    const ok = confirm('¿Eliminar este grupo? Esta acción no se puede deshacer.');
    if (!ok) return;
    this.misProfesService.deleteClase(claseId).subscribe({
      next: () => {
        const key = profesor.username;
        // Quitar del mapa local
        if (Array.isArray(this.gruposMap[key])) {
          this.gruposMap[key] = (this.gruposMap[key] || []).filter((g: any) => g.id !== claseId);
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
