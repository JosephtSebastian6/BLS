import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AnalyticsService } from '../../services/analytics.service';

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
    const unidadesGuardadas = localStorage.getItem('unidades');
    if (unidadesGuardadas) {
      const unidades = JSON.parse(unidadesGuardadas);
      const idx = Number(this.unidadId) - 1;
      if (unidades[idx]) {
        if (!Array.isArray(unidades[idx].subcarpetas)) {
          unidades[idx].subcarpetas = [];
        }
        unidades[idx].subcarpetas.push({ nombre: this.nuevaSubcarpetaNombre, descripcion: this.nuevaSubcarpetaDescripcion });
        localStorage.setItem('unidades', JSON.stringify(unidades));
        this.subcarpetas = unidades[idx].subcarpetas;
        this.nuevaSubcarpetaNombre = '';
        this.nuevaSubcarpetaDescripcion = '';
        this.mostrarFormulario = false;
      }
    }
  }
  unidadId: string | null = null;
  subcarpetas: Array<{ nombre: string; descripcion?: string; archivos?: { name: string }[] }> = [];

  private heartbeatId: any;
  constructor(private route: ActivatedRoute, private router: Router, private analytics: AnalyticsService) {
    this.unidadId = this.route.snapshot.paramMap.get('id');
    this.cargarSubcarpetas();
    // Detecta tipo de usuario
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.tipoUsuario = user.tipo_usuario || localStorage.getItem('tipo_usuario') || '';
  }
  irADetalleSubcarpeta(idx: number) {
    if (!this.unidadId) return;
    const sub = idx;
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
        this.subcarpetas = unidades[idx].subcarpetas;
      } else {
        this.subcarpetas = [];
      }
    } else {
      this.subcarpetas = [];
    }
  }

  eliminarSubcarpeta(idx: number) {
    if (!this.unidadId) return;
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
