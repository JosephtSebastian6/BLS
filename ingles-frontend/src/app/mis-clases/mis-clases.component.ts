import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CalendarModule, CalendarEvent, CalendarView, DateAdapter, CalendarDateFormatter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { addHours, startOfDay } from 'date-fns';

@Component({
  selector: 'app-mis-clases',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, RouterModule, CalendarModule],
  templateUrl: './mis-clases.component.html',
  styleUrls: ['./mis-clases.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: DateAdapter,
      useFactory: adapterFactory
    },
    CalendarDateFormatter
  ]
})
export class MisClasesComponent implements OnInit {
  clases: any[] = [];
  loading = true;
  error = '';

  view: CalendarView = CalendarView.Week;
  CalendarView = CalendarView;
  viewDate: Date = new Date();
  events: CalendarEvent[] = [];

  // Formulario nueva clase
  nuevaClase = { dia: '', hora: '', tema: '', meet_link: '' };
  creandoClase = false;
  errorNuevaClase = '';
  exitoNuevaClase = false;

  // Username real del profesor, se obtiene en ngOnInit
  profesorUsername = '';

  estudiantesDisponibles: any[] = [];
  loadingEstudiantes = false;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

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
          this.events = data.map(clase => {
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

  crearClase() {
    this.errorNuevaClase = '';
    this.exitoNuevaClase = false;
    this.creandoClase = true;
    
    // Validar que el profesor_username no esté vacío
    if (!this.profesorUsername) {
      this.errorNuevaClase = 'Error: No se pudo identificar al profesor. Por favor, inicia sesión nuevamente.';
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
        setTimeout(() => this.exitoNuevaClase = false, 2000);
      },
      error: (err) => {
        this.errorNuevaClase = 'No se pudo crear la clase.';
        this.creandoClase = false;
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
        },
        error: (err) => {
          clase.errorAgendar = 'No se pudo agendar.';
          clase.agendando = false;
        }
      });
  }
}
