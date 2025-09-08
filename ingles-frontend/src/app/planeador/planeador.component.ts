import { Component, OnInit, LOCALE_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, CommonModule, registerLocaleData } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import localeEs from '@angular/common/locales/es';
import { AttendanceService, AsistenciaRegistro } from '../services/attendance.service';

@Component({
  selector: 'app-planeador',
  templateUrl: './planeador.component.html',
  styleUrls: ['./planeador.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule, DatePipe, HttpClientModule]
})
export class PlaneadorComponent implements OnInit {
  days: string[] = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  hours: string[] = [
    '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM', '12 PM',
    '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM', '9 PM'
  ];
  eventos: { dia: string, hora: string, titulo: string, fecha: Date, esClaseBackend?: boolean, claseId?: number, meetLink?: string }[] = [];
  modalVisible = false;
  eventoDia = '';
  eventoHora = '';
  nuevoTitulo = '';
  
  // Propiedades para modal de detalles de clase
  modalTipo: 'agregar' | 'detalles' = 'agregar';
  claseSeleccionada: any = null;
  // Asistencia
  asistenciaEditando = false;
  presentesSet: Set<string> = new Set(); // emails presentes
  guardandoAsistencia = false;
  mensajeAsistencia = '';

  // Semana actual
  currentDate: Date = new Date();
  weekDates: Date[] = [];

  // Propiedades para clases del backend
  clases: any[] = [];
  profesorUsername = '';
  loading = true;
  error = '';

  // ===== Reporte (sin descargas/DB) =====
  reporteVisible = false;
  reporteGenerando = false;
  reporteResumen: { tema: string; fecha: string; hora: string; total: number; presentes: number; ausentes: number } | null = null;
  reporteFilas: Array<{ nombre: string; id: string; presente: boolean }> = [];

  constructor(private http: HttpClient, private attendanceService: AttendanceService) {
    registerLocaleData(localeEs);
    this.setWeekDates();
  }

  ngOnInit() {
    const username = localStorage.getItem('username');
    if (username) {
      this.profesorUsername = username;
    } else {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.username) {
        this.profesorUsername = user.username;
      }
    }
    
    if (this.profesorUsername) {
      this.cargarClasesDelBackend();
    }
  }

  setWeekDates() {
    const date = new Date(this.currentDate);
    const dayOfWeek = date.getDay();
    // Domingo como inicio de semana
    date.setDate(date.getDate() - dayOfWeek);
    this.weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(date);
      d.setDate(date.getDate() + i);
      this.weekDates.push(new Date(d));
    }
    
    // Recargar eventos si ya tenemos clases cargadas
    if (this.clases.length > 0) {
      this.convertirClasesAEventos();
    }
  }

  prevWeek() {
    this.currentDate = new Date(this.currentDate);
    this.currentDate.setDate(this.currentDate.getDate() - 7);
    this.setWeekDates();
  }

  nextWeek() {
    this.currentDate = new Date(this.currentDate);
    this.currentDate.setDate(this.currentDate.getDate() + 7);
    this.setWeekDates();
  }

  getWeekTitle(): string {
    const start = this.weekDates[0];
    const end = this.weekDates[6];
    const sameMonth = start.getMonth() === end.getMonth();
    const sameYear = start.getFullYear() === end.getFullYear();

    if (sameMonth) {
      // Mismo mes: Semana del 1 al 6 de septiembre 2025
      return `Semana del ${start.getDate()} al ${end.getDate()} de ${this.getMonthName(start)} ${start.getFullYear()}`;
    }

    // Mes distinto: Semana del 31 de agosto al 6 de septiembre 2025 (o rango de años si aplica)
    const yearPart = sameYear ? `${start.getFullYear()}` : `${start.getFullYear()}–${end.getFullYear()}`;
    return `Semana del ${start.getDate()} de ${this.getMonthName(start)} al ${end.getDate()} de ${this.getMonthName(end)} ${yearPart}`;
  }

  getMonthName(date: Date): string {
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return meses[date.getMonth()];
  }

  abrirModal(dia: string, hora: string) {
    this.eventoDia = dia;
    this.eventoHora = hora;
    
    // Verificar si hay una clase en esta celda
    const eventosEnCelda = this.obtenerEventos(dia, hora);
    const claseEnCelda = eventosEnCelda.find(e => e.esClaseBackend);
    
    console.log('Eventos en celda:', eventosEnCelda);
    console.log('Clase en celda:', claseEnCelda);
    
    if (claseEnCelda) {
      // Mostrar detalles de la clase
      this.modalTipo = 'detalles';
      this.claseSeleccionada = this.clases.find(c => c.id === claseEnCelda.claseId);
      console.log('Clase seleccionada:', this.claseSeleccionada);
      console.log('Todas las clases:', this.clases);
      // Preparar asistencia
      this.cargarAsistencia();
    } else {
      // Mostrar modal para agregar evento
      this.modalTipo = 'agregar';
      this.nuevoTitulo = '';
      this.claseSeleccionada = null;
    }
    
    this.modalVisible = true;
  }

  cerrarModal() {
    this.modalVisible = false;
    this.claseSeleccionada = null;
    this.asistenciaEditando = false;
    this.presentesSet.clear();
    this.mensajeAsistencia = '';
  }

  abrirMeet() {
    if (this.claseSeleccionada?.meet_link) {
      window.open(this.claseSeleccionada.meet_link, '_blank');
    }
  }

  // Utilidades comunes
  private fechaHoraDeClase(clase: any): Date {
    const hora = (clase?.hora || '00:00').slice(0,5);
    return new Date(`${clase?.dia}T${hora}:00`);
  }
  esClasePasada(clase: any): boolean {
    if (!clase?.dia) return false;
    return this.fechaHoraDeClase(clase).getTime() < Date.now();
  }

  // ===== Reporte =====
  verReporteClaseSeleccionada() {
    if (!this.claseSeleccionada) return;
    const clase = this.claseSeleccionada;
    this.reporteVisible = true;
    this.reporteGenerando = true;
    const presentes = Array.from(this.presentesSet || new Set<string>());
    const filas = (clase.estudiantes || []).map((e: any) => {
      const nombre = `${e.nombres || e.nombre || ''} ${e.apellidos || ''}`.trim();
      const id = e.email || e.username || '';
      return { nombre, id, presente: presentes.includes(id) };
    });
    this.reporteFilas = filas;
    this.reporteResumen = {
      tema: clase.tema || '',
      fecha: clase.dia || '',
      hora: (clase.hora || '').toString(),
      total: filas.length,
      presentes: filas.filter((f: {presente:boolean}) => f.presente).length,
      ausentes: filas.filter((f: {presente:boolean}) => !f.presente).length,
    };
    this.reporteGenerando = false;
  }

  cerrarReporte() {
    this.reporteVisible = false;
    this.reporteGenerando = false;
    this.reporteResumen = null;
    this.reporteFilas = [];
  }

  copiarReporteCSVFormal() {
    if (!this.reporteResumen) return;
    const org = 'ACADEMY ENGLISH — Reporte de Asistencia';
    const fechaGen = new Date();
    const iso = `${fechaGen.getFullYear()}-${String(fechaGen.getMonth()+1).padStart(2,'0')}-${String(fechaGen.getDate()).padStart(2,'0')} ${String(fechaGen.getHours()).padStart(2,'0')}:${String(fechaGen.getMinutes()).padStart(2,'0')}`;
    const rs = this.reporteResumen;
    const encabezado = [org];
    const meta = [
      `Generado:,${iso}`,
      `Tema:,${rs.tema}`,
      `Fecha:,${rs.fecha}`,
      `Hora:,${rs.hora}`,
      `Totales:,Presentes ${rs.presentes},Ausentes ${rs.ausentes},Inscritos ${rs.total}`
    ];
    const tablaHeader = ['Estudiante','Identificador','Estado'];
    const filas = this.reporteFilas.map(r => [r.nombre.replaceAll(',',' '), r.id, r.presente ? 'PRESENTE' : 'AUSENTE']);
    const csv = [
      encabezado.join(','),
      '',
      ...meta,
      '',
      tablaHeader.join(','),
      ...filas.map((f: string[]) => f.join(','))
    ].join('\n');
    navigator.clipboard.writeText(csv);
    this.mensajeAsistencia = 'Reporte copiado al portapapeles';
  }

  imprimirReporte() {
    setTimeout(() => window.print(), 50);
  }

  // ===== Asistencia =====
  toggleAsistencia() {
    if (this.esClasePasada(this.claseSeleccionada)) {
      this.mensajeAsistencia = 'La clase ya finalizó. No se puede tomar asistencia.';
      return;
    }
    this.asistenciaEditando = !this.asistenciaEditando;
    if (this.asistenciaEditando && this.presentesSet.size === 0) {
      this.cargarAsistencia();
    }
  }

  private cargarAsistencia() {
    if (!this.claseSeleccionada?.id) return;
    const claseId = this.claseSeleccionada.id as number;
    this.attendanceService.getAsistencia(claseId).subscribe(reg => {
      this.presentesSet.clear();
      if (reg?.presentes) {
        reg.presentes.forEach((email: string) => this.presentesSet.add(email));
      }
    });
  }

  isPresente(email: string): boolean {
    return this.presentesSet.has(email);
  }

  togglePresente(email: string) {
    if (this.presentesSet.has(email)) this.presentesSet.delete(email);
    else this.presentesSet.add(email);
  }

  guardarAsistencia() {
    if (!this.claseSeleccionada?.id) return;
    if (this.esClasePasada(this.claseSeleccionada)) {
      this.mensajeAsistencia = 'La clase ya finalizó. No se puede guardar asistencia.';
      return;
    }
    const claseId = this.claseSeleccionada.id as number;
    const registro: AsistenciaRegistro = {
      claseId,
      fechaISO: new Date().toISOString().slice(0,10),
      presentes: Array.from(this.presentesSet)
    };
    this.guardandoAsistencia = true;
    this.mensajeAsistencia = '';
    this.attendanceService.saveAsistencia(registro).subscribe({
      next: () => {
        this.guardandoAsistencia = false;
        this.mensajeAsistencia = 'Asistencia guardada correctamente';
        this.asistenciaEditando = false;
      },
      error: () => {
        this.guardandoAsistencia = false;
        this.mensajeAsistencia = 'No se pudo guardar la asistencia';
      }
    });
  }

  formatearFecha(fechaString: string): string {
    const fecha = new Date(fechaString + 'T00:00:00');
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                   'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    
    const diaSemana = diasSemana[fecha.getDay()];
    const dia = fecha.getDate();
    const mes = meses[fecha.getMonth()];
    const año = fecha.getFullYear();
    
    return `${diaSemana}, ${dia} de ${mes} de ${año}`;
  }

  agregarEvento() {
    if (this.nuevoTitulo.trim()) {
      // Asocia el evento a la fecha de la semana actual
      const fecha = this.weekDates[this.days.indexOf(this.eventoDia)];
      this.eventos.push({ dia: this.eventoDia, hora: this.eventoHora, titulo: this.nuevoTitulo, fecha });
      this.cerrarModal();
    }
  }

  cargarClasesDelBackend() {
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
          console.log('Datos recibidos del backend:', data);
          this.clases = data;
          this.convertirClasesAEventos();
          this.loading = false;
        },
        error: (err) => {
          console.error('Error cargando clases:', err);
          this.error = 'No se pudieron cargar las clases.';
          this.loading = false;
        }
      });
  }

  convertirClasesAEventos() {
    // Limpiar eventos existentes del backend
    this.eventos = this.eventos.filter(e => !e.esClaseBackend);
    
    // Convertir clases del backend a eventos del planeador
    this.clases.forEach(clase => {
      // Crear fecha correctamente evitando problemas de zona horaria
      const [year, month, day] = clase.dia.split('-');
      const fechaClase = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const horaClase = clase.hora;
      
      // Convertir hora de 24h a formato AM/PM
      const [hour, minute] = horaClase.split(':');
      const hourNum = parseInt(hour);
      let horaFormateada = '';
      
      if (hourNum === 0) {
        horaFormateada = '12 AM';
      } else if (hourNum < 12) {
        horaFormateada = `${hourNum} AM`;
      } else if (hourNum === 12) {
        horaFormateada = '12 PM';
      } else {
        horaFormateada = `${hourNum - 12} PM`;
      }
      
      // Obtener día de la semana
      const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const diaIndex = fechaClase.getDay();
      const diaTexto = diasSemana[diaIndex];
      
      console.log('Clase del backend:', {
        diaOriginal: clase.dia,
        fechaClase: fechaClase,
        diaIndex: diaIndex,
        diaTexto: diaTexto,
        hora: horaFormateada
      });
      
      this.eventos.push({
        dia: diaTexto,
        hora: horaFormateada,
        titulo: `${clase.tema} (${clase.estudiantes?.length || 0} estudiantes)`,
        fecha: fechaClase,
        esClaseBackend: true,
        claseId: clase.id,
        meetLink: clase.meet_link
      });
    });
  }

  obtenerEventos(dia: string, hora: string) {
    const fecha = this.weekDates[this.days.indexOf(dia)];
    return this.eventos.filter(e => {
      if (e.esClaseBackend) {
        // Para eventos del backend, comparar por fecha exacta
        return e.dia === dia && e.hora === hora && 
               e.fecha.toDateString() === fecha.toDateString();
      } else {
        // Para eventos locales, usar la lógica original
        return e.dia === dia && e.hora === hora && 
               e.fecha.getTime() === fecha.getTime();
      }
    });
  }

  // Devuelve true si la clase ocurrió hace más de 3 días (a partir del inicio del día actual)
  esPasada3Dias(fechaClase: Date): boolean {
    if (!fechaClase) return false;
    const hoy = new Date();
    // Normalizar a inicio del día para evitar horas
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const inicioClase = new Date(fechaClase.getFullYear(), fechaClase.getMonth(), fechaClase.getDate());
    const diffMs = inicioHoy.getTime() - inicioClase.getTime();
    const dias = diffMs / (1000 * 60 * 60 * 24);
    return dias > 3;
  }

  // Devuelve true si la clase es hoy
  esHoy(fechaClase: Date): boolean {
    if (!fechaClase) return false;
    const hoy = new Date();
    return fechaClase.getFullYear() === hoy.getFullYear() &&
           fechaClase.getMonth() === hoy.getMonth() &&
           fechaClase.getDate() === hoy.getDate();
  }

  // Devuelve true si la clase ocurrirá en <= 3 días a partir de hoy (y no es pasada)
  esProximo3Dias(fechaClase: Date): boolean {
    if (!fechaClase) return false;
    const hoy = new Date();
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const inicioClase = new Date(fechaClase.getFullYear(), fechaClase.getMonth(), fechaClase.getDate());
    const diffMs = inicioClase.getTime() - inicioHoy.getTime();
    const dias = diffMs / (1000 * 60 * 60 * 24);
    return dias > 0 && dias <= 3; // próximos 3 días, excluye hoy
  }
}
