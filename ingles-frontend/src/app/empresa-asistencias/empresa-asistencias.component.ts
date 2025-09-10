import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from '../services/attendance.service';

@Component({
  selector: 'app-empresa-asistencias',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './empresa-asistencias.component.html',
  styleUrls: ['./empresa-asistencias.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmpresaAsistenciasComponent implements OnInit {
  desde = '';
  hasta = '';
  loading = false;
  error = '';
  clases: any[] = [];

  // Modal asistencia
  modalVisible = false;
  detalleLoading = false;
  detalleError = '';
  asistencia: any = null;

  constructor(private attendance: AttendanceService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Rango por defecto: últimos 30 días
    const hoy = new Date();
    const hace30 = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
    this.desde = hace30.toISOString().slice(0, 10);
    this.hasta = hoy.toISOString().slice(0, 10);
    this.buscar();
  }

  buscar() {
    this.loading = true;
    this.error = '';
    this.attendance.getEmpresaClases(this.desde, this.hasta).subscribe({
      next: (rows) => { this.clases = rows || []; this.loading = false; console.log('Empresa clases:', rows); this.cdr.markForCheck(); },
      error: (e) => { this.error = 'No se pudo cargar el listado'; this.loading = false; console.error('Error getEmpresaClases', e); this.cdr.markForCheck(); }
    });
  }

  verAsistencia(clase: any) {
    this.modalVisible = true;
    this.detalleLoading = true;
    this.detalleError = '';
    this.asistencia = null;
    this.attendance.getAsistenciaEmpresa(clase.id).subscribe({
      next: (data) => {
        if (!data) data = {};
        // Fallback: normalizar estructura
        data.detalle = Array.isArray(data.detalle) ? data.detalle : [];
        data.presentes = Array.isArray(data.presentes) ? data.presentes : [];
        this.asistencia = data;
        this.detalleLoading = false;
        console.log('Empresa asistencia detalle:', data);
        this.cdr.markForCheck();
      },
      error: (e) => { this.detalleError = 'No se pudo cargar la asistencia'; this.detalleLoading = false; console.error('Error getAsistenciaEmpresa', e); this.cdr.markForCheck(); }
    });
  }

  cerrarModal() {
    this.modalVisible = false;
    this.asistencia = null;
  }
}
