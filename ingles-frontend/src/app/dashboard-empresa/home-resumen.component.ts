import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface KPI {
  label: string;
  value: string;
  sub?: string;
  icon?: string;
}

interface UnidadResumen {
  nombre: string;
  avance: number; // porcentaje
  estudiantes: number;
  tendencia: 'up' | 'down' | 'flat';
}

interface ActividadItem {
  usuario: string;
  evento: string;
  fecha: string; // ISO o legible
}

@Component({
  selector: 'app-home-resumen-empresa',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './home-resumen.component.html',
  styleUrls: ['./home-resumen.component.css']
})
export class HomeResumenComponent {
  // Rango de fechas (mock)
  selectedRange: '7d' | '30d' | '90d' | 'custom' = '7d';
  startDate?: string; // yyyy-mm-dd
  endDate?: string;   // yyyy-mm-dd

  // Datos mock (luego se conectan al backend)
  kpis: KPI[] = [
    { label: 'Estudiantes activos', value: '128', sub: 'últimos 7 días', icon: 'groups' },
    { label: 'Avance promedio', value: '62%', sub: 'todas las unidades', icon: 'trending_up' },
    { label: 'Tiempo total', value: '142h', sub: 'acumulado', icon: 'schedule' },
    { label: 'Racha promedio', value: '3 días', sub: 'actividad', icon: 'bolt' },
    { label: 'Unidades completadas', value: '418', sub: 'histórico', icon: 'check_circle' },
  ];

  unidades: UnidadResumen[] = [
    { nombre: 'Unidad 1 - Introducción', avance: 78, estudiantes: 96, tendencia: 'up' },
    { nombre: 'Unidad 2 - Procesos', avance: 61, estudiantes: 90, tendencia: 'flat' },
    { nombre: 'Unidad 3 - RRHH', avance: 44, estudiantes: 87, tendencia: 'down' },
    { nombre: 'Unidad 4 - Proyectos', avance: 23, estudiantes: 80, tendencia: 'up' },
  ];

  actividad: ActividadItem[] = [
    { usuario: 'Sebastián', evento: 'completó Unidad 2', fecha: 'hace 12 min' },
    { usuario: 'María', evento: 'obtuvo 85/100 en Quiz 3', fecha: 'hace 1 h' },
    { usuario: 'Carlos', evento: 'inició Unidad 3', fecha: 'ayer' },
    { usuario: 'Laura', evento: 'revisó materiales de Unidad 1', fecha: 'ayer' },
  ];

  alertas = {
    bajoProgreso: [ 'andres', 'tatiana' ],
    inactivos: [ 'julian', 'camila' ],
  };

  // Distribución de desempeño (para donut)
  distribucion = { alto: 42, medio: 38, bajo: 20 };
  private readonly C = 283; // circunferencia aproximada para r=45

  setRange(range: '7d' | '30d' | '90d' | 'custom') {
    this.selectedRange = range;
    if (range !== 'custom') {
      this.startDate = undefined;
      this.endDate = undefined;
      // Aquí podríamos refrescar datos mock según el rango
    }
  }

  // Porcentajes para el donut
  get totalDistribucion(): number {
    const { alto, medio, bajo } = this.distribucion;
    return alto + medio + bajo;
  }

  get pctAlto(): number { return Math.round((this.distribucion.alto / this.totalDistribucion) * 100); }
  get pctMedio(): number { return Math.round((this.distribucion.medio / this.totalDistribucion) * 100); }
  get pctBajo(): number { return 100 - this.pctAlto - this.pctMedio; }

  // Utilidades SVG donut
  private dash(pct: number): string { return `${Math.max(0, Math.min(100, pct)) / 100 * this.C} ${this.C}`; }
  get altoDash(): string { return this.dash(this.pctAlto); }
  get medioDash(): string { return this.dash(this.pctMedio); }
  get bajoDash(): string { return this.dash(this.pctBajo); }
  get medioOffset(): string { return `${- (this.pctAlto / 100) * this.C}`; }
  get bajoOffset(): string { return `${- ((this.pctAlto + this.pctMedio) / 100) * this.C}`; }

  onDateChange(which: 'start' | 'end', value: string) {
    if (which === 'start') this.startDate = value;
    else this.endDate = value;
    this.selectedRange = 'custom';
  }
}
