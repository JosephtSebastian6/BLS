

import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AnalyticsService } from '../../services/analytics.service';

@Component({
  selector: 'app-subcarpeta-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './subcarpeta-detalle.component.html',
  styleUrls: ['./subcarpeta-detalle.component.css']
})
export class SubcarpetaDetalleComponent implements OnInit, OnDestroy {
  readonly MAX_FILE_SIZE_MB = 5;
  progresoCarga: number = 0;
  cargandoArchivos: boolean = false;
  modalArchivo: { name: string; type: string; dataUrl: string } | null = null;
  unidadId: string | null = null;
  subcarpetaIdx: number = 0;
  subcarpetaNombre: string = '';
  archivos: { name: string; type: string; dataUrl: string, link?: string }[] = [];
  nuevoLink: string = '';
  nombreLink: string = '';

  tipoUsuario: string = '';
  
  // Variables para sistema de estudiantes (NO interfiere con empresa)
  mostrarUploadEstudiante = false;
  archivosEstudianteSeleccionados: File[] = [];
  archivosEstudianteSubidos: any[] = [];
  uploadingEstudiante = false;
  isDragOverEstudiante = false;
  
  private heartbeatId: any;
  constructor(private route: ActivatedRoute, private router: Router, private sanitizer: DomSanitizer, private analytics: AnalyticsService) {
    this.unidadId = this.route.snapshot.paramMap.get('id');
    this.subcarpetaIdx = Number(this.route.snapshot.paramMap.get('sub'));
    // Detecta tipo de usuario
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.tipoUsuario = user.tipo_usuario || localStorage.getItem('tipo_usuario') || '';
  }

  ngOnInit() {
    this.cargarArchivos();
    this.cargarNombreSubcarpeta();
    
    // Si es estudiante y está en SOLO TAREAS, cargar archivos del backend
    if (this.tipoUsuario === 'estudiante' && this.esSoloTareas()) {
      this.cargarArchivosEstudiante();
    }
    
    // Tracking start + heartbeat por unidad
    if (this.unidadId) {
      const idNum = Number(this.unidadId);
      // Asegurar relación estudiante_unidad habilitada antes de trackear
      const uname = this.getCurrentUsername();
      if (uname) {
        this.analytics.ensureUnidadHabilitada(uname, idNum).subscribe({ next: () => {}, error: () => {} });
      }
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

  cargarArchivos() {
    if (!this.unidadId) return;
    const key = `unidad_${this.unidadId}_sub_${this.subcarpetaIdx}`;
    const archivosGuardados = localStorage.getItem(key);
    if (archivosGuardados) {
      this.archivos = JSON.parse(archivosGuardados);
    }
  }

  abrirModal(archivo: any) {
    this.modalArchivo = archivo;
  }
  cerrarModal() {
    this.modalArchivo = null;
  }
  limpiarArchivos() {
    if (!this.unidadId) return;
    const key = `unidad_${this.unidadId}_sub_${this.subcarpetaIdx}`;
    localStorage.removeItem(key);
    this.archivos = [];
  }
  getSafeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
  volverADetalleUnidad() {
    if (!this.unidadId) return;
    if (this.tipoUsuario === 'estudiante') {
      this.router.navigate(['/dashboard-estudiante/unidades', this.unidadId]);
    } else if (this.tipoUsuario === 'profesor') {
      this.router.navigate(['/dashboard-profesor/unidades', this.unidadId]);
    } else {
      this.router.navigate(['/dashboard-empresa/unidades', this.unidadId]);
    }
  }
  async onFileSelected(event: any) {
    const files: File[] = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const archivosGrandes = files.filter(f => f.size > this.MAX_FILE_SIZE_MB * 1024 * 1024);
    if (archivosGrandes.length) {
      alert(`Los siguientes archivos superan ${this.MAX_FILE_SIZE_MB}MB y no se subirán: \n- ` + archivosGrandes.map(f => f.name).join('\n- '));
    }
    const filesValidos = files.filter(f => f.size <= this.MAX_FILE_SIZE_MB * 1024 * 1024);
    if (!filesValidos.length) return;
    this.cargandoArchivos = true;
    this.progresoCarga = 0;
    const nuevosArchivos: { name: string; type: string; dataUrl: string }[] = [];
    const readFile = (file: File) => new Promise<{ name: string; type: string; dataUrl: string }>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        resolve({ name: file.name, type: file.type, dataUrl: e.target.result });
      };
      reader.readAsDataURL(file);
    });
    for (let i = 0; i < filesValidos.length; i++) {
      const archivo = await readFile(filesValidos[i]);
      nuevosArchivos.push(archivo);
      this.progresoCarga = Math.round(((i + 1) / filesValidos.length) * 100);
    }
    this.archivos.push(...nuevosArchivos);
    this.guardarArchivos();
    setTimeout(() => {
      this.cargandoArchivos = false;
      this.progresoCarga = 0;
      alert('Archivos subidos correctamente');
    }, 500);
  }
  guardarArchivos() {
    if (!this.unidadId) return;
    const key = `unidad_${this.unidadId}_sub_${this.subcarpetaIdx}`;
    localStorage.setItem(key, JSON.stringify(this.archivos));
  }

  agregarLink() {
    if (!this.nuevoLink.trim() || !this.nombreLink.trim()) return;
    this.archivos.push({ name: this.nombreLink, type: 'link', dataUrl: '', link: this.nuevoLink });
    this.guardarArchivos();
    this.nuevoLink = '';
    this.nombreLink = '';
  }

  eliminarUnidad() {
    if (!this.unidadId) return;
    if (!confirm('¿Seguro que deseas eliminar esta unidad? Esta acción no se puede deshacer.')) return;
    const unidadesGuardadas = localStorage.getItem('unidades');
    if (unidadesGuardadas) {
      const unidades = JSON.parse(unidadesGuardadas);
      const idx = Number(this.unidadId) - 1;
      if (unidades[idx]) {
        unidades.splice(idx, 1);
        localStorage.setItem('unidades', JSON.stringify(unidades));
      }
    }
    // Opcional: eliminar archivos de subcarpetas de la unidad
    // for (let i = 0; i < 100; i++) {
    //   localStorage.removeItem(`unidad_${this.unidadId}_sub_${i}`);
    // }
    this.router.navigate(['/dashboard-empresa/unidades']);
  }

  // ===== MÉTODOS PARA ESTUDIANTES (SOLO TAREAS) =====
  
  esSoloTareas(): boolean {
    return this.subcarpetaNombre.toLowerCase().includes('solo tareas');
  }

  cargarNombreSubcarpeta() {
    if (!this.unidadId) return;
    const unidadesGuardadas = localStorage.getItem('unidades');
    if (unidadesGuardadas) {
      const unidades = JSON.parse(unidadesGuardadas);
      const unidad = unidades[Number(this.unidadId) - 1];
      if (unidad && unidad.subcarpetas && unidad.subcarpetas[this.subcarpetaIdx]) {
        this.subcarpetaNombre = unidad.subcarpetas[this.subcarpetaIdx].nombre;
      }
    }
  }

  cargarArchivosEstudiante() {
    if (!this.unidadId || !this.esSoloTareas()) {
      console.log('🔍 DEBUG: No se cargan archivos - unidadId:', this.unidadId, 'esSoloTareas:', this.esSoloTareas());
      return;
    }
    
    console.log('🔍 DEBUG: Cargando archivos para unidad:', this.unidadId, 'subcarpeta:', this.subcarpetaNombre);
    
    // Backend SOLO permite exactamente "SOLO TAREAS"
    const sub = 'SOLO TAREAS';
    this.analytics.getArchivosSubcarpeta(Number(this.unidadId), sub).subscribe({
      next: (archivos) => {
        this.archivosEstudianteSubidos = archivos;
        console.log('✅ Archivos de estudiante cargados:', archivos);
        console.log('📊 Total archivos:', archivos.length);
      },
      error: (error) => {
        console.error('❌ Error cargando archivos de estudiante:', error);
        console.error('❌ Status:', error.status, 'Message:', error.message);
      }
    });
  }

  onFileSelectedEstudiante(event: any) {
    const files: File[] = Array.from(event.target.files ?? []);
    this.archivosEstudianteSeleccionados = files.filter(f => f.size <= this.MAX_FILE_SIZE_MB * 1024 * 1024);
    
    if (files.length > this.archivosEstudianteSeleccionados.length) {
      alert(`Algunos archivos superan ${this.MAX_FILE_SIZE_MB}MB y no se subirán.`);
    }
  }

  onDragOverEstudiante(event: DragEvent) {
    event.preventDefault();
    this.isDragOverEstudiante = true;
  }

  onDragLeaveEstudiante(event: DragEvent) {
    event.preventDefault();
    this.isDragOverEstudiante = false;
  }

  onDropEstudiante(event: DragEvent) {
    event.preventDefault();
    this.isDragOverEstudiante = false;
    
    const files: File[] = Array.from(event.dataTransfer?.files ?? []);
    this.archivosEstudianteSeleccionados = files.filter(f => f.size <= this.MAX_FILE_SIZE_MB * 1024 * 1024);
    
    if (files.length > this.archivosEstudianteSeleccionados.length) {
      alert(`Algunos archivos superan ${this.MAX_FILE_SIZE_MB}MB y no se subirán.`);
    }
  }

  subirArchivosEstudiante() {
    if (!this.archivosEstudianteSeleccionados.length || !this.unidadId) return;
    
    this.uploadingEstudiante = true;
    
    // Backend SOLO permite exactamente "SOLO TAREAS"
    const sub = 'SOLO TAREAS';
    const idNum = Number(this.unidadId);
    const uname = this.getCurrentUsername();
    const subir = () => this.analytics.subirArchivosSubcarpeta(idNum, sub, this.archivosEstudianteSeleccionados).subscribe({
      next: (response) => {
        console.log('✅ Archivos subidos exitosamente:', response);
        this.uploadingEstudiante = false;
        this.archivosEstudianteSeleccionados = [];
        this.cargarArchivosEstudiante(); // Recargar lista
        alert('Archivos subidos exitosamente');
      },
      error: (error) => {
        console.error('❌ Error subiendo archivos:', error);
        this.uploadingEstudiante = false;
        alert('Error al subir archivos. Por favor intenta de nuevo.');
      }
    });
    if (uname) {
      this.analytics.ensureUnidadHabilitada(uname, idNum).subscribe({ next: () => subir(), error: () => subir() });
    } else {
      subir();
    }
  }

  private getCurrentUsername(): string | null {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user?.username || localStorage.getItem('username');
    } catch { return localStorage.getItem('username'); }
  }

  abrirModalEstudiante(archivo: any) {
    const fileUrl = `http://localhost:8000/auth/estudiantes/subcarpetas/${this.unidadId}/SOLO%20TAREAS/files/${archivo.filename}`;
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    
    // Para archivos de imagen, descargar con fetch y crear blob URL
    if (this.esImagen(archivo.filename)) {
      fetch(fileUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(response => {
        if (!response.ok) throw new Error('Error al cargar imagen');
        return response.blob();
      }).then(blob => {
        const url = window.URL.createObjectURL(blob);
        this.modalArchivo = {
          name: archivo.original_name,
          type: 'image',
          dataUrl: url
        };
      }).catch(err => {
        console.error('Error cargando imagen:', err);
        alert('Error al cargar imagen');
      });
    } else {
      // Para otros archivos, abrir en nueva pestaña
      fetch(fileUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(response => {
        if (!response.ok) throw new Error('Error al descargar archivo');
        return response.blob();
      }).then(blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = archivo.original_name;
        link.click();
        window.URL.revokeObjectURL(url);
      }).catch(err => {
        console.error('Error descargando archivo:', err);
        alert('Error al descargar archivo');
      });
    }
  }

  esImagen(filename: string): boolean {
    const extensionesImagen = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return extensionesImagen.includes(extension);
  }

  eliminarArchivoEstudiante(archivo: any) {
    const nombreArchivo = archivo.original_name || archivo.filename;
    if (!confirm(`¿Seguro que deseas eliminar el archivo "${nombreArchivo}"?`)) return;
    
    // TODO: Implementar endpoint para eliminar archivos específicos
    console.log('Eliminar archivo:', archivo);
    alert('Funcionalidad de eliminación pendiente de implementar');
  }

  formatearTamano(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }


}
