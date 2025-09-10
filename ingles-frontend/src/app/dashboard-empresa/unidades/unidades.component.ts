import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmpresaGruposService } from '../../services/empresa-grupos.service';

interface Unidad {
  id: number;
  nombre: string;
  descripcion?: string;
}

@Component({
  selector: 'app-empresa-unidades',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './unidades.component.html',
  styleUrls: ['./unidades.component.css']
})
export class EmpresaUnidadesComponent implements OnInit {
  unidades: Unidad[] = [];

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
}