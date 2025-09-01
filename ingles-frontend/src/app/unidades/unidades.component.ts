import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

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

  constructor(private router: Router, private http: HttpClient) {
    // Para estudiante, lee desde el objeto user en localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.tipoUsuario = user.tipo_usuario || localStorage.getItem('tipo_usuario') || '';
    
    if (this.tipoUsuario === 'estudiante') {
      this.cargarUnidadesHabilitadas();
    } else {
      this.cargarUnidades();
      // Sincronizar unidades existentes al cargar el componente
      if (this.tipoUsuario === 'empresa') {
        this.sincronizarConBackend();
      }
    }
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
    this.sincronizarConBackend();
  }

  sincronizarConBackend() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No hay token, no se puede sincronizar');
      return;
    }

    console.log('Sincronizando unidades:', this.unidades);
    this.http.post('http://localhost:8000/auth/unidades/sync', this.unidades, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (response) => {
        console.log('✅ Unidades sincronizadas con backend:', response);
      },
      error: (error) => {
        console.error('❌ Error sincronizando unidades:', error);
      }
    });
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

  cargarUnidadesHabilitadas() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No hay token, cargando desde localStorage');
      this.cargarUnidades();
      return;
    }

    console.log('Cargando unidades habilitadas desde backend...');
    this.http.get<any[]>('http://localhost:8000/auth/estudiantes/me/unidades-habilitadas', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (unidades) => {
        console.log('✅ Unidades recibidas del backend:', unidades);
        this.unidades = unidades.map(u => ({
          nombre: u.nombre,
          descripcion: u.descripcion,
          subcarpetas: []
        }));
      },
      error: (error) => {
        console.error('❌ Error cargando unidades habilitadas:', error);
        console.log('Fallback: cargando desde localStorage');
        this.cargarUnidades();
      }
    });
  }

  eliminarUnidad(idx: number, event: MouseEvent) {
    event.stopPropagation();
    if (!confirm('¿Seguro que deseas eliminar esta unidad? Esta acción no se puede deshacer.')) return;
    this.unidades.splice(idx, 1);
    this.guardarUnidades();
  }
}
