import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpresaGruposService } from '../../services/empresa-grupos.service';

interface Unidad {
  id: number;
  nombre: string;
  descripcion?: string;
}

@Component({
  selector: 'app-empresa-unidades',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './unidades.component.html',
  styleUrls: ['./unidades.component.css']
})
export class EmpresaUnidadesComponent implements OnInit {
  unidades: Unidad[] = [];
  nueva = { nombre: '', descripcion: '' };
  creando = false;

  constructor(
    private gruposSvc: EmpresaGruposService
  ) {}

  ngOnInit(): void {
    this.cargarUnidades();
  }

  cargarUnidades(): void {
    this.gruposSvc.listarUnidades().subscribe({
      next: (u) => {
        this.unidades = u || [];
      },
      error: (e) => {
        console.error('Error cargando unidades', e);
        this.unidades = [];
      }
    });
  }

  crearUnidad(): void {
    const payload: any = { nombre: (this.nueva.nombre || '').trim() };
    if (!payload.nombre) return;
    if (this.nueva.descripcion && this.nueva.descripcion.trim()) {
      payload.descripcion = this.nueva.descripcion.trim();
    }
    this.creando = true;
    this.gruposSvc.crearUnidad(payload).subscribe({
      next: () => {
        this.nueva = { nombre: '', descripcion: '' };
        this.cargarUnidades();
        this.creando = false;
      },
      error: (e) => {
        console.error('Error creando unidad', e);
        this.creando = false;
      }
    });
  }
}