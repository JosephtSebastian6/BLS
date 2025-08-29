

import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-subcarpeta-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subcarpeta-detalle.component.html',
  styleUrls: ['./subcarpeta-detalle.component.css']
})
export class SubcarpetaDetalleComponent implements OnInit {
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
  constructor(private route: ActivatedRoute, private router: Router, private sanitizer: DomSanitizer) {
    this.unidadId = this.route.snapshot.paramMap.get('id');
    this.subcarpetaIdx = Number(this.route.snapshot.paramMap.get('sub'));
    // Detecta tipo de usuario
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.tipoUsuario = user.tipo_usuario || localStorage.getItem('tipo_usuario') || '';
  }

  ngOnInit() {
    this.cargarArchivos();
  }

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


}
