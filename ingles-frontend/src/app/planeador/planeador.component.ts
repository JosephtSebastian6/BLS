import { Component, OnInit, LOCALE_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, CommonModule, registerLocaleData } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import localeEs from '@angular/common/locales/es';

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

  // Semana actual
  currentDate: Date = new Date();
  weekDates: Date[] = [];

  // Propiedades para clases del backend
  clases: any[] = [];
  profesorUsername = '';
  loading = true;
  error = '';

  constructor(private http: HttpClient) {
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
    return `Semana del ${start.getDate()} al ${end.getDate()} de ${this.getMonthName(start)} ${start.getFullYear()}`;
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
  }

  abrirMeet() {
    if (this.claseSeleccionada?.meet_link) {
      window.open(this.claseSeleccionada.meet_link, '_blank');
    }
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
}
