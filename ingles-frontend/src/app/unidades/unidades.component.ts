  import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { EmpresaGruposService } from '../services/empresa-grupos.service';
import { AnalyticsService } from '../services/analytics.service';

@Component({
  selector: 'app-unidades',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './unidades.component.html',
  styleUrls: ['./unidades.component.css']
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
    this.http.get<any[]>('http://localhost:8000/auth/estudiantes/me/unidades-habilitadas', {
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
}
