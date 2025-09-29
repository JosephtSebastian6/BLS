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
        // Aceptar múltiples campos provenientes del backend para "presentes"
        const posibles = [
          data.presentes,
          data.presentes_ids,
          data.presentes_emails,
          data.presentes_usernames,
          data.lista_presentes,
          data.alumnos_presentes,
          data.students_present,
        ].filter(Boolean).flat();
        data.presentes = Array.isArray(posibles) ? posibles : [];

        // Normalización: marcar como presente si su id/email/username aparece en 'presentes'
        try {
          const normalize = (v: any): string => (v ?? '').toString().trim().toLowerCase();

          const extractId = (obj: any): string => {
            if (obj == null) return '';
            if (typeof obj === 'string' || typeof obj === 'number') return normalize(obj);
            // objetos: intentar campos conocidos
            const cand = obj.id ?? obj.email ?? obj.username ?? obj.identificador ?? obj.usuario ?? obj.correo ?? obj.nombre ?? (obj.estudiante?.email) ?? (obj.estudiante?.username);
            return normalize(cand);
          };

          const presentesNorm: string[] = (data.presentes || []).map((x: any) => extractId(x)).filter(Boolean);
          const presentesSet = new Set<string>(presentesNorm);

          const tokenMatches = (token: string, candidate: string) => {
            if (!token || !candidate) return false;
            if (token === candidate) return true;
            // match por prefijo/sufijo o inclusión (ej: 'sebastian' dentro de 'sebastianxx@gmail.com')
            return candidate.includes(token) || token.includes(candidate);
          };

          data.detalle = data.detalle.map((d: any) => {
            const candIds = [d?.id, d?.email, d?.username, d?.identificador, d?.usuario, d?.correo, d?.nombre, d?.estudiante?.email, d?.estudiante?.username];
            const normIds = candIds.map(extractId).filter(Boolean);
            const anyMatch = normIds.some((id: string) => presentesSet.has(id) || presentesNorm.some(tok => tokenMatches(tok, id)));
            // soportar valores 'PRESENTE'/'SI' en strings
            const flagStr = (d?.presente || d?.estado || d?.asistencia || '').toString().toUpperCase();
            const boolFromStr = ['PRESENTE','SI','1','TRUE','ASISTENTE','ASISTIO','ASISTIÓ','PRESENT','ATTENDED','ATTEND','OK']
              .some(k => flagStr.includes(k));
            const presentCalc = Boolean(d?.presente === true) || boolFromStr || anyMatch;
            return { ...d, _presentCalc: presentCalc, presente: presentCalc };
          });

          // Ajustar resumen si existe
          const presentesCount = data.detalle.filter((x: any) => x.presente).length;
          data.presentes = Array.from(presentesSet);
          data.presentes_count = presentesCount;
        } catch {}

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

  // Nota: el template usa d.presente tras normalización
}
