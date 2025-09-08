import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CalendarModule, CalendarEvent, CalendarView, DateAdapter, CalendarDateFormatter, CalendarA11y, CalendarUtils } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { LOCALE_ID } from '@angular/core';
import { addHours, startOfDay } from 'date-fns';
import { AttendanceService, AsistenciaRegistro } from '../services/attendance.service';

@Component({
  selector: 'app-mis-clases',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    RouterModule,
    CalendarModule
  ],
  templateUrl: './mis-clases.component.html',
  styleUrls: ['./mis-clases.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: DateAdapter, useFactory: adapterFactory },
    CalendarDateFormatter,
    CalendarA11y,
    CalendarUtils,
    { provide: LOCALE_ID, useValue: 'es' }
  ]
})
export class MisClasesComponent implements OnInit {
  clases: any[] = [];
  loading = true;
  error = '';

  view: CalendarView = CalendarView.Month;
  CalendarView = CalendarView;
  viewDate: Date = new Date();
  events: CalendarEvent[] = [];

  // Formulario nueva clase
  nuevaClase = { dia: '', hora: '', tema: '', meet_link: '' };
  creandoClase = false;
  errorNuevaClase = '';
  exitoNuevaClase = false;
  intentoEnvio = false;

  // Toasts
  toastMensaje = '';
  toastTipo: 'exito' | 'error' | '' = '';
  toastVisible = false;

  // Username real del profesor, se obtiene en ngOnInit
  profesorUsername = '';

  estudiantesDisponibles: any[] = [];
  loadingEstudiantes = false;
  private limpiezaIntervalId: any = null;
  private readonly LIMITE_DIAS_PASADO = 15; // clases más antiguas que esto se ocultan

  // ===== Asistencia =====
  asistenciaEditandoId: number | null = null;
  presentesPorClase: Record<number, Set<string>> = {};
  guardandoAsistenciaId: number | null = null;
  mensajeAsistencia: string = '';

  // ===== Reporte sin descarga/DB =====
  reporteVisibleId: number | null = null;
  reporteGenerando = false;
  reporteResumen: { total: number; presentes: number; ausentes: number; fecha: string; hora: string; tema: string } | null = null;
  reporteFilas: Array<{ nombre: string; id: string; presente: boolean }> = [];

  // Acciones de limpieza manual / eliminación individual
  selectedClaseId: number | '' = '';
  eliminando = false;
  confirmDeleteOpen = false;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private attendanceService: AttendanceService) {
    // Registrar datos de localización para 'es' para que DatePipe funcione
    registerLocaleData(localeEs);
  }

  limpiarAhora() {
    this.eliminarClasesAntiguas();
  }

  abrirConfirmacionEliminar() {
    if (!this.selectedClaseId) return;
    this.confirmDeleteOpen = true;
  }

  cancelarEliminar() {
    this.confirmDeleteOpen = false;
  }

  confirmarEliminar() {
    if (!this.selectedClaseId) { this.confirmDeleteOpen = false; return; }
    this.eliminando = true;
    const token = localStorage.getItem('token');
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const id = this.selectedClaseId;
    this.http.delete(`http://localhost:8000/auth/clases/${id}`, { headers }).subscribe({
      next: () => { this.mostrarToast('Clase eliminada', 'exito'); this.selectedClaseId = ''; this.cargarClases(); this.eliminando = false; this.confirmDeleteOpen = false; },
      error: () => { this.mostrarToast('No se pudo eliminar la clase', 'error'); this.eliminando = false; this.confirmDeleteOpen = false; }
    });
  }

  // ===== Reporte (sin CSV ni tabla nueva) =====
  async verReporte(clase: any) {
    const claseId = clase.id as number;
    this.reporteVisibleId = claseId;
    this.reporteGenerando = true;
    // Obtener presentes: prioriza estado local; si está vacío, intenta service (localStorage)
    let presentes: string[] = Array.from(this.presentesPorClase[claseId] || new Set<string>());
    if (presentes.length === 0) {
      try {
        const reg: any = await this.attendanceService.getAsistencia(claseId).toPromise();
        if (reg?.presentes?.length) presentes = reg.presentes;
      } catch {}
    }

    const total = (clase.estudiantes?.length || 0);
    const filas: Array<{ nombre: string; id: string; presente: boolean }> = (clase.estudiantes || []).map((est: any) => {
      const nombre = `${est.nombres || est.nombre || ''} ${est.apellidos || ''}`.trim();
      const id = est.email || est.username || '';
      return { nombre, id, presente: presentes.includes(id) };
    });

    this.reporteFilas = filas;
    this.reporteResumen = {
      total,
      presentes: filas.filter(f => f.presente).length,
      ausentes: filas.filter(f => !f.presente).length,
      fecha: clase.dia || '',
      hora: (clase.hora || '').toString(),
      tema: clase.tema || ''
    };
    this.reporteGenerando = false;
    this.cdr.markForCheck();
  }

  cerrarReporte() {
    this.reporteVisibleId = null;
    this.reporteGenerando = false;
    this.reporteResumen = null;
    this.reporteFilas = [];
  }

  copiarReporteCSV() {
    if (!this.reporteResumen) return;
    const org = 'ACADEMY ENGLISH — Reporte de Asistencia';
    const fechaGen = new Date();
    const iso = `${fechaGen.getFullYear()}-${String(fechaGen.getMonth()+1).padStart(2,'0')}-${String(fechaGen.getDate()).padStart(2,'0')} ${String(fechaGen.getHours()).padStart(2,'0')}:${String(fechaGen.getMinutes()).padStart(2,'0')}`;
    const rs = this.reporteResumen;
    const meta = [
      `Generado:,${iso}`,
      `Tema:,${(rs.tema || '').replaceAll(',', ' ')}`,
      `Fecha:,${rs.fecha}`,
      `Hora:,${rs.hora}`,
      `Totales:,Presentes ${rs.presentes},Ausentes ${rs.ausentes},Inscritos ${rs.total}`
    ];
    const header = ['Estudiante','Identificador','Estado'];
    const detalle = this.reporteFilas.map(r => [r.nombre.replaceAll(',', ' '), r.id, r.presente ? 'PRESENTE' : 'AUSENTE'].join(','));
    const csv = [org, '', ...meta, '', header.join(','), ...detalle].join('\n');
    navigator.clipboard.writeText(csv);
    this.mostrarToast('Reporte copiado al portapapeles', 'exito');
  }

  imprimirReporte() {
    // Usar una ligera demora para asegurar render del modal
    setTimeout(() => window.print(), 50);
  }

  // Exportar asistencia de una clase a CSV
  exportarAsistenciaCSV(clase: any) {
    const claseId = clase.id as number;
    // Intentar obtener del backend; si no hay, usar el estado/localStorage a través del service
    this.attendanceService.getAsistencia(claseId).subscribe(reg => {
      const presentes = reg?.presentes || Array.from(this.presentesPorClase[claseId] || new Set<string>());
      const total = (clase.estudiantes?.length || 0);
      const header = ['clase_id','tema','fecha','hora','total_inscritos','presentes'];
      const fecha = clase.dia || '';
      const hora = (clase.hora || '').toString();
      const filas = [
        [claseId, (clase.tema || '').replaceAll(',', ' '), fecha, hora, total, presentes.length]
      ];
      // Detalle por estudiante
      const detalleHeader = ['estudiante','identificador','presente'];
      const detalleFilas = (clase.estudiantes || []).map((est: any) => {
        const nombre = `${est.nombres || est.nombre || ''} ${est.apellidos || ''}`.trim().replaceAll(',', ' ');
        const id = est.email || est.username || '';
        const presente = presentes.includes(id) ? 'SI' : 'NO';
        return [nombre, id, presente];
      });

      const csvPart1 = [header.join(','), ...filas.map((r: (string|number)[]) => r.join(','))].join('\n');
      const csvPart2 = ['', 'DETALLE'].join('\n');
      const csvPart3 = [detalleHeader.join(','), ...detalleFilas.map((r: (string)[]) => r.join(','))].join('\n');
      const csv = `${csvPart1}\n${csvPart2}\n${csvPart3}`;
      this.descargarTextoComoArchivo(csv, `asistencia_clase_${claseId}.csv`, 'text/csv;charset=utf-8');
    });
  }

  private descargarTextoComoArchivo(contenido: string, nombre: string, tipo: string) {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  ngOnInit() {
    const username = localStorage.getItem('username');
    console.log('Username from localStorage:', username);
    
    if (username) {
      this.profesorUsername = username;
    } else {
      // Intentar obtener de otras fuentes
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      console.log('User object from localStorage:', user);
      
      if (user.username) {
        this.profesorUsername = user.username;
      }
    }
    
    console.log('Final profesorUsername:', this.profesorUsername);
    
    if (this.profesorUsername) {
      this.cargarClases();
      this.cargarEstudiantes();
    } else {
      this.error = 'No se pudo obtener el username del profesor';
      this.loading = false;
    }

    // Limpieza automática: re-evaluar cada 24h por si cambia el umbral al pasar los días
    if (!this.limpiezaIntervalId) {
      this.limpiezaIntervalId = setInterval(() => {
        // Reaplicar limpieza en memoria
        this.aplicarLimpiezaAntiguas();
        // Intentar borrar en backend las que superen 15 días
        this.eliminarClasesAntiguas();
        this.cdr.markForCheck();
      }, 24 * 60 * 60 * 1000);
    }
  }

  cargarClases() {
    this.loading = true;
    const token = localStorage.getItem('token');
    const headers: any = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    this.http.get<any[]>(`http://localhost:8000/auth/clases/${this.profesorUsername}`, {
      headers: headers
    })
      .subscribe({
        next: (data) => {
          this.clases = data;
          this.aplicarLimpiezaAntiguas();
          // Ordenar por fecha+hora ASC
          this.clases.sort((a, b) => this.fechaHoraDeClase(a).getTime() - this.fechaHoraDeClase(b).getTime());

          this.events = this.clases.map(clase => {
            const start = new Date(`${clase.dia}T${clase.hora}`);
            return {
              start: start,
              end: addHours(start, 1),
              title: clase.tema,
              meta: {
                ...clase
              }
            };
          });
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = 'No se pudieron cargar las clases.';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  cargarEstudiantes() {
    this.loadingEstudiantes = true;
    const token = localStorage.getItem('token');
    const headers: any = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    this.http.get<any[]>('http://localhost:8000/auth/estudiantes-disponibles', {
      headers: headers
    })
      .subscribe({
        next: (data) => {
          this.estudiantesDisponibles = data;
          this.loadingEstudiantes = false;
        },
        error: () => {
          this.estudiantesDisponibles = [];
          this.loadingEstudiantes = false;
        }
      });
  }

  // ===== Asistencia (Mis Clases) =====
  toggleAsistencia(clase: any) {
    if (this.esPasada(clase)) { this.mostrarToast('La clase ya finalizó. No se puede tomar asistencia.', 'error'); return; }
    if (this.asistenciaEditandoId === clase.id) {
      this.asistenciaEditandoId = null;
      this.mensajeAsistencia = '';
      return;
    }
    this.asistenciaEditandoId = clase.id;
    this.mensajeAsistencia = '';
    this.cargarAsistencia(clase.id);
  }

  private cargarAsistencia(claseId: number) {
    this.attendanceService.getAsistencia(claseId).subscribe(reg => {
      if (!this.presentesPorClase[claseId]) this.presentesPorClase[claseId] = new Set<string>();
      this.presentesPorClase[claseId].clear();
      if (reg?.presentes) reg.presentes.forEach((k: string) => this.presentesPorClase[claseId].add(k));
      this.cdr.markForCheck();
    });
  }

  private keyEstudiante(est: any): string {
    return est?.email || est?.username || `${est?.nombres || ''}.${est?.apellidos || ''}`.trim();
  }

  isPresente(claseId: number, est: any): boolean {
    const key = this.keyEstudiante(est);
    return this.presentesPorClase[claseId]?.has(key) || false;
  }

  togglePresente(claseId: number, est: any) {
    const key = this.keyEstudiante(est);
    if (!this.presentesPorClase[claseId]) this.presentesPorClase[claseId] = new Set<string>();
    if (this.presentesPorClase[claseId].has(key)) this.presentesPorClase[claseId].delete(key);
    else this.presentesPorClase[claseId].add(key);
  }

  guardarAsistencia(clase: any) {
    if (this.esPasada(clase)) { this.mostrarToast('La clase ya finalizó. No se puede guardar asistencia.', 'error'); return; }
    const claseId = clase.id as number;
    const presentes = Array.from(this.presentesPorClase[claseId] || new Set<string>());
    const registro: AsistenciaRegistro = {
      claseId,
      fechaISO: new Date().toISOString().slice(0,10),
      presentes
    };
    this.guardandoAsistenciaId = claseId;
    this.mensajeAsistencia = '';
    this.attendanceService.saveAsistencia(registro).subscribe({
      next: () => {
        this.guardandoAsistenciaId = null;
        this.mensajeAsistencia = 'Asistencia guardada';
        this.asistenciaEditandoId = null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.guardandoAsistenciaId = null;
        this.mensajeAsistencia = 'Error guardando asistencia';
        this.cdr.markForCheck();
      }
    });
  }

  crearClase() {
    this.errorNuevaClase = '';
    this.exitoNuevaClase = false;
    this.creandoClase = true;
    this.intentoEnvio = true;

    // Validar que el profesor_username no esté vacío
    if (!this.profesorUsername) {
      this.errorNuevaClase = 'Error: No se pudo identificar al profesor. Por favor, inicia sesión nuevamente.';
      this.creandoClase = false;
      return;
    }

    // Validaciones simples del formulario
    if (!this.nuevaClase.dia || !this.nuevaClase.hora || !this.nuevaClase.tema || !this.nuevaClase.meet_link) {
      this.errorNuevaClase = 'Por favor completa todos los campos.';
      this.creandoClase = false;
      return;
    }

    const token = localStorage.getItem('token');
    const headers: any = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const body = {
      ...this.nuevaClase,
      profesor_username: this.profesorUsername,
      estudiantes: []
    };
    
    this.http.post('http://localhost:8000/auth/clases/', body, {
      headers: headers
    }).subscribe({
      next: () => {
        this.exitoNuevaClase = true;
        this.nuevaClase = { dia: '', hora: '', tema: '', meet_link: '' };
        this.cargarClases();
        this.creandoClase = false;
        this.intentoEnvio = false;
        this.mostrarToast('Clase creada exitosamente', 'exito');
        setTimeout(() => this.exitoNuevaClase = false, 2000);
      },
      error: (err) => {
        this.errorNuevaClase = 'No se pudo crear la clase.';
        this.creandoClase = false;
        this.mostrarToast('No se pudo crear la clase', 'error');
      }
    });
  }

  setView(view: CalendarView) {
    this.view = view;
  }

  agendarEstudiante(claseId: number, index: number) {
    const clase = this.clases[index];
    clase.errorAgendar = '';
    clase.exitoAgendar = false;
    clase.agendando = true;
    
    const token = localStorage.getItem('token');
    const headers: any = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    this.http.post(`http://localhost:8000/auth/clases/${claseId}/agendar-estudiante`, 
      { estudiante_username: clase.nuevoEstudiante },
      { headers: headers }
    )
      .subscribe({
        next: (data: any) => {
          clase.exitoAgendar = true;
          clase.errorAgendar = '';
          clase.nuevoEstudiante = '';
          clase.estudiantes = data.estudiantes ? data.estudiantes.length : 0;
          clase.agendando = false;
          this.cargarClases(); // Refresca la lista de clases y estudiantes inscritos
          setTimeout(() => clase.exitoAgendar = false, 2000);
          this.mostrarToast('Estudiante agendado correctamente', 'exito');
        },
        error: (err) => {
          clase.errorAgendar = 'No se pudo agendar.';
          clase.agendando = false;
          this.mostrarToast('No se pudo agendar al estudiante', 'error');
        }
      });
  }

  // Utilidades
  fechaHoraDeClase(clase: any): Date {
    // clase.dia: YYYY-MM-DD, clase.hora: HH:mm:ss o HH:mm
    const hora = (clase.hora || '00:00').slice(0,5);
    return new Date(`${clase.dia}T${hora}:00`);
  }

  esProxima48h(clase: any): boolean {
    const fh = this.fechaHoraDeClase(clase).getTime();
    const ahora = Date.now();
    const en48 = ahora + (48 * 60 * 60 * 1000);
    return fh >= ahora && fh <= en48;
  }

  esPasada(clase: any): boolean {
    const fh = this.fechaHoraDeClase(clase).getTime();
    return fh < Date.now();
  }

  private aplicarLimpiezaAntiguas() {
    if (!Array.isArray(this.clases)) return;
    const ahora = Date.now();
    const limiteMs = this.LIMITE_DIAS_PASADO * 24 * 60 * 60 * 1000;
    this.clases = this.clases.filter(c => {
      const fh = this.fechaHoraDeClase(c).getTime();
      return (ahora - fh) <= limiteMs; // mantener si no supera 15 días de antigüedad
    });
  }

  // Borra en backend las clases con más de 15 días de antigüedad (endpoint batch)
  private eliminarClasesAntiguas() {
    const token = localStorage.getItem('token');
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const dias = this.LIMITE_DIAS_PASADO;
    const url = `http://localhost:8000/auth/clases/antiguas?dias=${dias}&profesor_username=${encodeURIComponent(this.profesorUsername)}`;
    this.http.delete(url, { headers }).subscribe({
      next: (res: any) => {
        if (res && typeof res.eliminadas === 'number') {
          if (res.eliminadas > 0) this.mostrarToast(`Eliminadas ${res.eliminadas} clases antiguas`, 'exito');
          this.cargarClases();
        }
      },
      error: () => {
        this.mostrarToast('No se pudieron eliminar clases antiguas (batch)', 'error');
      }
    });
  }

  mostrarToast(msg: string, tipo: 'exito' | 'error') {
    this.toastMensaje = msg;
    this.toastTipo = tipo;
    this.toastVisible = true;
    setTimeout(() => this.toastVisible = false, 2500);
  }

  campoInvalido(nombre: keyof typeof this.nuevaClase): boolean {
    return this.intentoEnvio && (!this.nuevaClase[nombre] || this.nuevaClase[nombre].trim() === '');
  }
}
