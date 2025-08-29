import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-unidades',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './unidades.component.html',
  styleUrls: ['./unidades.component.css']
})
export class UnidadesComponent {
  unidades: { nombre: string; descripcion: string; subcarpetas: { nombre: string }[] }[] = [];
  mostrarFormulario = false;
  nuevaUnidad = { nombre: '', descripcion: '', subcarpetas: [] as { nombre: string }[] };
  tipoUsuario: string = '';

  constructor(private router: Router) {
    this.cargarUnidades();
    // Para estudiante, lee desde el objeto user en localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.tipoUsuario = user.tipo_usuario || localStorage.getItem('tipo_usuario') || '';
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
  }

  guardarUnidades() {
    localStorage.setItem('unidades', JSON.stringify(this.unidades));
  }

  guardarUnidad() {
    if (!this.nuevaUnidad.nombre.trim() || !this.nuevaUnidad.descripcion.trim()) return;
    this.unidades.push({ ...this.nuevaUnidad, subcarpetas: [] });
    this.guardarUnidades();
    this.nuevaUnidad = { nombre: '', descripcion: '', subcarpetas: [] };
    this.mostrarFormulario = false;
  }

  cancelarUnidad() {
    this.nuevaUnidad = { nombre: '', descripcion: '', subcarpetas: [] };
    this.mostrarFormulario = false;
  }

  irADetalleUnidad(idx: number) {
    if (this.tipoUsuario === 'estudiante') {
      this.router.navigate([`/dashboard-estudiante/unidades/${idx + 1}`]);
    } else if (this.tipoUsuario === 'profesor') {
      this.router.navigate([`/unidades/${idx + 1}`]);
    } else {
      this.router.navigate([`/dashboard-empresa/unidades/${idx + 1}`]);
    }
  }

  eliminarUnidad(idx: number, event: MouseEvent) {
    event.stopPropagation();
    if (!confirm('¿Seguro que deseas eliminar esta unidad? Esta acción no se puede deshacer.')) return;
    this.unidades.splice(idx, 1);
    this.guardarUnidades();
  }
}
