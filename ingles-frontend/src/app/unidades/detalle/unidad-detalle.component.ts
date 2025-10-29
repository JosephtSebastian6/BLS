import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AnalyticsService } from '../../services/analytics.service';
import { EmpresaGruposService } from '../../services/empresa-grupos.service';

@Component({
  selector: 'app-unidad-detalle',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HttpClientModule],
  templateUrl: './unidad-detalle.component.html',
  styleUrls: ['./unidad-detalle.component.css']
})
export class UnidadDetalleComponent implements OnInit, OnDestroy {
  editandoIdx: number | null = null;
  editNombre: string = '';
  editDescripcion: string = '';
  mostrarFormulario = false;
  nuevaSubcarpetaNombre = '';
  nuevaSubcarpetaDescripcion = '';
  tipoUsuario: string = '';
  agregarSubcarpeta() {
    if (!this.nuevaSubcarpetaNombre.trim() || !this.unidadId) return;
    const idNum = Number(this.unidadId);
    // Estudiante: mantiene local
    if (this.tipoUsuario === 'estudiante') {
      const unidadesGuardadas = localStorage.getItem('unidades');
      if (unidadesGuardadas) {
        const unidades = JSON.parse(unidadesGuardadas);
        const idx = idNum - 1;
        if (unidades[idx]) {
          if (!Array.isArray(unidades[idx].subcarpetas)) {
            unidades[idx].subcarpetas = [];
          }
          unidades[idx].subcarpetas.push({ nombre: this.nuevaSubcarpetaNombre, descripcion: this.nuevaSubcarpetaDescripcion, habilitada: true });
          localStorage.setItem('unidades', JSON.stringify(unidades));
          this.subcarpetas = unidades[idx].subcarpetas;
          this.nuevaSubcarpetaNombre = '';
          this.nuevaSubcarpetaDescripcion = '';
          this.mostrarFormulario = false;
        }
      }
      return;
    }

    // Empresa/Profesor: crear en backend
    const payload = { nombre: this.nuevaSubcarpetaNombre.trim(), descripcion: this.nuevaSubcarpetaDescripcion?.trim() || undefined };
    console.log('[UI] POST backend subcarpeta ->', idNum, payload);
    this.empresaSvc.crearSubcarpeta(idNum, payload).subscribe({
      next: () => {
        this.nuevaSubcarpetaNombre = '';
        this.nuevaSubcarpetaDescripcion = '';
        this.mostrarFormulario = false;
        // refrescar desde backend para ver el cambio y que Android también lo lea
        this.cargarSubcarpetasDesdeBackend();
      },
      error: (e: any) => {
        console.error('[UI] POST subcarpeta ERROR ->', e);
        alert('Error creando subcarpeta: ' + (e?.message || e?.status || 'desconocido'));
      }
    });
  }
  unidadId: string | null = null;
  subcarpetas: Array<{ id?: number; nombre: string; descripcion?: string; archivos?: { name: string }[]; habilitada?: boolean }> = [];

  private heartbeatId: any;
  constructor(private route: ActivatedRoute, private router: Router, private analytics: AnalyticsService, private empresaSvc: EmpresaGruposService) {
    this.unidadId = this.route.snapshot.paramMap.get('id');
    this.cargarSubcarpetas();
    // Detecta tipo de usuario
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.tipoUsuario = user.tipo_usuario || localStorage.getItem('tipo_usuario') || '';
    // Si empresa/profesor, sincroniza desde backend
    if (this.tipoUsuario === 'empresa' || this.tipoUsuario === 'profesor') {
      this.cargarSubcarpetasDesdeBackend();
    }
  }
  irADetalleSubcarpeta(idx: number) {
    if (!this.unidadId) return;
    const sub = idx;
    // Si es estudiante y la subcarpeta está oculta, no permitir navegar
    if (this.tipoUsuario === 'estudiante' && this.subcarpetas[idx] && this.subcarpetas[idx].habilitada === false) {
      return;
    }
    if (this.tipoUsuario === 'estudiante') {
      this.router.navigate([
        '/dashboard-estudiante/unidades',
        this.unidadId,
        'subcarpeta',
        sub
      ]);
    } else if (this.tipoUsuario === 'profesor') {
      this.router.navigate([
        '/dashboard-profesor/unidades',
        this.unidadId,
        'subcarpeta',
        sub
      ], { replaceUrl: false });
    } else {
      this.router.navigate([
        '/dashboard-empresa/unidades',
        this.unidadId,
        'subcarpeta',
        sub
      ]);
    }
  }

  volverAUnidades() {
    if (this.tipoUsuario === 'estudiante') {
      this.router.navigate(['/dashboard-estudiante/unidades']);
    } else if (this.tipoUsuario === 'profesor') {
      this.router.navigate(['/dashboard-profesor/unidades']);
    } else {
      this.router.navigate(['/dashboard-empresa/unidades']);
    }
  }

  ngOnInit() {
    this.cargarArchivosDeLocalStorage();
    // Tracking start + heartbeat
    if (this.unidadId) {
      const idNum = Number(this.unidadId);
      this.analytics.trackingStart(idNum).subscribe({ next: () => {}, error: () => {} });
      this.heartbeatId = setInterval(() => {
        this.analytics.trackingHeartbeat(idNum, 1).subscribe({ next: () => {}, error: () => {} });
      }, 60000);
      window.addEventListener('beforeunload', this._onBeforeUnload);
    }
  }

  ngOnDestroy(): void {
    if (this.heartbeatId) clearInterval(this.heartbeatId);
    window.removeEventListener('beforeunload', this._onBeforeUnload);
    if (this.unidadId) {
      const idNum = Number(this.unidadId);
      this.analytics.trackingEnd(idNum).subscribe({ next: () => {}, error: () => {} });
    }
  }

  private _onBeforeUnload = () => {
    if (this.unidadId) {
      const idNum = Number(this.unidadId);
      this.analytics.trackingEnd(idNum).subscribe({ next: () => {}, error: () => {} });
    }
  };

  cargarArchivosDeLocalStorage() {
    if (!this.unidadId) return;
    this.subcarpetas.forEach((sub, idx) => {
      const key = `unidad_${this.unidadId}_sub_${idx}`;
      const archivosGuardados = localStorage.getItem(key);
      if (archivosGuardados) {
        sub.archivos = JSON.parse(archivosGuardados);
      }
    });
  }

  cargarSubcarpetas() {
    const unidadesGuardadas = localStorage.getItem('unidades');
    if (unidadesGuardadas && this.unidadId) {
      const unidades = JSON.parse(unidadesGuardadas);
      const idx = Number(this.unidadId) - 1;
      if (unidades[idx] && Array.isArray(unidades[idx].subcarpetas)) {
        // Normaliza: si no existe 'habilitada', se asume true
        this.subcarpetas = (unidades[idx].subcarpetas as any[]).map((s: any) => ({
          ...s,
          habilitada: s.habilitada === undefined ? true : s.habilitada
        }));
        // guarda normalización
        unidades[idx].subcarpetas = this.subcarpetas;
        localStorage.setItem('unidades', JSON.stringify(unidades));
      } else {
        this.subcarpetas = [];
      }
    } else {
      this.subcarpetas = [];
    }
  }

  // Backend: sobreescribe lista desde la API
  cargarSubcarpetasDesdeBackend() {
    if (!this.unidadId) return;
    const idNum = Number(this.unidadId);
    console.log('[UI] GET backend subcarpetas unidad ->', idNum);
    this.empresaSvc.listarSubcarpetas(idNum).subscribe({
      next: (subs: any[]) => {
        console.log('[UI] GET subcarpetas OK ->', subs);
        this.subcarpetas = (subs || []).map((s: any) => ({
          id: s.id,
          nombre: s.nombre,
          descripcion: s.descripcion,
          habilitada: s.habilitada
        }));
        // Reflejar en localStorage para compatibilidad
        const unidadesGuardadas = localStorage.getItem('unidades');
        if (unidadesGuardadas) {
          const unidades = JSON.parse(unidadesGuardadas);
          const idx = idNum - 1;
          if (unidades[idx]) {
            unidades[idx].subcarpetas = this.subcarpetas;
            localStorage.setItem('unidades', JSON.stringify(unidades));
          }
        }
      },
      error: (e: any) => {
        console.error('[UI] GET subcarpetas ERROR ->', e);
      }
    });
  }

  eliminarSubcarpeta(idx: number) {
    if (!this.unidadId) return;

    // Para estudiantes: solo local
    if (this.tipoUsuario === 'estudiante') {
      if (!confirm('¿Seguro que deseas eliminar esta subcarpeta?')) return;
      const unidadesGuardadas = localStorage.getItem('unidades');
      if (unidadesGuardadas) {
        const unidades = JSON.parse(unidadesGuardadas);
        const unidadIdx = Number(this.unidadId) - 1;
        if (unidades[unidadIdx] && Array.isArray(unidades[unidadIdx].subcarpetas)) {
          unidades[unidadIdx].subcarpetas.splice(idx, 1);
          localStorage.setItem('unidades', JSON.stringify(unidades));
          this.subcarpetas = unidades[unidadIdx].subcarpetas;
        }
      }
      return;
    }

    // Para empresa/profesor: usar backend
    const subcarpeta = this.subcarpetas[idx];
    if (!subcarpeta || !subcarpeta.id) {
      alert('Error: No se puede eliminar la subcarpeta (ID no encontrado)');
      return;
    }

    if (!confirm('¿Seguro que deseas eliminar esta subcarpeta? Esta acción no se puede deshacer.')) return;

    console.log('[UI] Eliminando subcarpeta:', subcarpeta.id);

    this.empresaSvc.eliminarSubcarpeta(Number(this.unidadId), subcarpeta.id).subscribe({
      next: (res: any) => {
        console.log('[UI] Subcarpeta eliminada correctamente:', res);
        this.cargarSubcarpetasDesdeBackend();
        alert('Subcarpeta eliminada correctamente.');
      },
      error: (error: any) => {
        console.error('[UI] Error eliminando subcarpeta:', error);
        let errorMessage = 'Error eliminando subcarpeta';
        if (error?.status === 403) {
          errorMessage = 'No tienes permisos para eliminar subcarpetas.';
        } else if (error?.status === 404) {
          errorMessage = 'Subcarpeta no encontrada.';
        } else if (error?.status >= 500) {
          errorMessage = 'Error del servidor. Intenta nuevamente más tarde.';
        } else {
          errorMessage = `Error: ${error?.message || error?.status || 'desconocido'}`;
        }
        alert(errorMessage);
      }
    });
  }

  // Alterna la visibilidad (habilitada) de una subcarpeta y la persiste
  toggleSubcarpeta(idx: number) {
    if (!this.unidadId) return;

    // Para estudiantes: solo local
    if (this.tipoUsuario === 'estudiante') {
      const unidadesGuardadas = localStorage.getItem('unidades');
      if (!unidadesGuardadas) return;
      const unidades = JSON.parse(unidadesGuardadas);
      const unidadIdx = Number(this.unidadId) - 1;
      if (!unidades[unidadIdx] || !Array.isArray(unidades[unidadIdx].subcarpetas)) return;
      const sub = unidades[unidadIdx].subcarpetas[idx];
      if (!sub) return;
      const current = sub.habilitada === undefined ? true : !!sub.habilitada;
      sub.habilitada = !current;
      localStorage.setItem('unidades', JSON.stringify(unidades));
      // Refleja en memoria
      this.subcarpetas[idx].habilitada = sub.habilitada;
      return;
    }

    // Para empresa/profesor: usar backend
    const subcarpeta = this.subcarpetas[idx];
    if (!subcarpeta || !subcarpeta.id) {
      alert('Error: No se puede cambiar la visibilidad de la subcarpeta (ID no encontrado)');
      return;
    }

    console.log('[UI] Toggle subcarpeta:', subcarpeta.id);

    this.empresaSvc.toggleSubcarpeta(Number(this.unidadId), subcarpeta.id).subscribe({
      next: (res: any) => {
        console.log('[UI] Subcarpeta toggle correctamente:', res);
        this.cargarSubcarpetasDesdeBackend();
        const estadoTexto = res.habilitada ? 'mostrada' : 'ocultada';
        alert(`Subcarpeta ${estadoTexto} correctamente.`);
      },
      error: (error: any) => {
        console.error('[UI] Error toggle subcarpeta:', error);
        let errorMessage = 'Error cambiando visibilidad de subcarpeta';
        if (error?.status === 403) {
          errorMessage = 'No tienes permisos para cambiar la visibilidad.';
        } else if (error?.status === 404) {
          errorMessage = 'Subcarpeta no encontrada.';
        } else if (error?.status >= 500) {
          errorMessage = 'Error del servidor. Intenta nuevamente más tarde.';
        } else {
          errorMessage = `Error: ${error?.message || error?.status || 'desconocido'}`;
        }
        alert(errorMessage);
      }
    });
  }

  iniciarEdicion(idx: number) {
    this.editandoIdx = idx;
    this.editNombre = this.subcarpetas[idx].nombre;
    this.editDescripcion = this.subcarpetas[idx].descripcion || '';
  }

  cancelarEdicion() {
    this.editandoIdx = null;
    this.editNombre = '';
    this.editDescripcion = '';
  }

  guardarEdicion() {
    if (this.editandoIdx === null || !this.unidadId) return;

    // Para estudiantes: solo local
    if (this.tipoUsuario === 'estudiante') {
      const unidadesGuardadas = localStorage.getItem('unidades');
      if (unidadesGuardadas) {
        const unidades = JSON.parse(unidadesGuardadas);
        const unidadIdx = Number(this.unidadId) - 1;
        if (unidades[unidadIdx] && Array.isArray(unidades[unidadIdx].subcarpetas)) {
          unidades[unidadIdx].subcarpetas[this.editandoIdx] = {
            ...unidades[unidadIdx].subcarpetas[this.editandoIdx],
            nombre: this.editNombre,
            descripcion: this.editDescripcion
          };
          localStorage.setItem('unidades', JSON.stringify(unidades));
          this.subcarpetas = unidades[unidadIdx].subcarpetas;
          this.cancelarEdicion();
        }
      }
      return;
    }

    // Para empresa/profesor: usar backend
    const subcarpeta = this.subcarpetas[this.editandoIdx];
    if (!subcarpeta || !subcarpeta.id) {
      alert('Error: No se puede editar la subcarpeta (ID no encontrado)');
      return;
    }

    const payload = {
      nombre: this.editNombre.trim(),
      descripcion: this.editDescripcion?.trim() || undefined
    };

    console.log('[UI] Editando subcarpeta:', subcarpeta.id, payload);

    this.empresaSvc.editarSubcarpeta(Number(this.unidadId), subcarpeta.id, payload).subscribe({
      next: (res: any) => {
        console.log('[UI] Subcarpeta editada correctamente:', res);
        this.cargarSubcarpetasDesdeBackend();
        this.cancelarEdicion();
        alert('Subcarpeta editada correctamente.');
      },
      error: (error: any) => {
        console.error('[UI] Error editando subcarpeta:', error);
        let errorMessage = 'Error editando subcarpeta';
        if (error?.status === 403) {
          errorMessage = 'No tienes permisos para editar subcarpetas.';
        } else if (error?.status === 404) {
          errorMessage = 'Subcarpeta no encontrada.';
        } else if (error?.status === 400) {
          errorMessage = 'Datos inválidos. Verifica el nombre.';
        } else if (error?.status >= 500) {
          errorMessage = 'Error del servidor. Intenta nuevamente más tarde.';
        } else {
          errorMessage = `Error: ${error?.message || error?.status || 'desconocido'}`;
        }
        alert(errorMessage);
      }
    });
  }

  guardarArchivosEnLocalStorage(idx: number) {
    if (!this.unidadId) return;
    const key = `unidad_${this.unidadId}_sub_${idx}`;
    localStorage.setItem(key, JSON.stringify(this.subcarpetas[idx].archivos));
  }

  onFileSelected(event: any, idx: number) {
    const files = Array.from(event.target.files ?? []);
    // Asegura que el array de archivos exista antes de hacer push
    if (!this.subcarpetas[idx].archivos) {
      this.subcarpetas[idx].archivos = [];
    }
    this.subcarpetas[idx].archivos.push(...files.map((f: any) => ({ name: f.name })));
    this.guardarArchivosEnLocalStorage(idx);
  }
}
