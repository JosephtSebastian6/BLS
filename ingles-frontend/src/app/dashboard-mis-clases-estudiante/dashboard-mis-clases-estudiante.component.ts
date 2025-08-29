import { Component, OnInit } from '@angular/core';
// ...existing code...




import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { DashboardLayoutComponent } from '../dashboard-layout/dashboard-layout.component';
import { HttpClient } from '@angular/common/http';
import { addDays, startOfMonth, endOfMonth, getDay, format } from 'date-fns';


export interface ClaseEstudiante {
  nombre: string;
  profesor: string;
  horario: string;
  activa: boolean;
  meet_link: string;
}

@Component({
  selector: 'app-dashboard-mis-clases-estudiante',
  standalone: true,
  imports: [CommonModule, RouterModule, DashboardLayoutComponent],
  templateUrl: './dashboard-mis-clases-estudiante.component.html',
  styleUrls: ['./dashboard-mis-clases-estudiante.component.css']
})
export class DashboardMisClasesEstudianteComponent implements OnInit {
  clases: ClaseEstudiante[] = [];
  loading = true;
  error = '';

  diasSemana = [
    { nombre: 'Lunes', valor: 'lunes' },
    { nombre: 'Martes', valor: 'martes' },
    { nombre: 'Miércoles', valor: 'miercoles' },
    { nombre: 'Jueves', valor: 'jueves' },
    { nombre: 'Viernes', valor: 'viernes' },
    { nombre: 'Sábado', valor: 'sabado' },
    { nombre: 'Domingo', valor: 'domingo' }
  ];

  menuItems = [
    { label: 'Mi Perfil', route: '/dashboard-estudiante', icon: 'person' },
    { label: 'Mis Cursos', route: '/dashboard-mis-cursos', icon: 'menu_book' },
    { label: 'Mis Clases', route: '/dashboard-mis-clases-estudiante', icon: 'class' },
    { label: 'Progreso', route: '/dashboard-progreso', icon: 'trending_up' },
    { label: 'Certificados', route: '', icon: 'verified', disabled: true }
  ];

  get activeRoute(): string {
    return this.router.url;
  }

  currentDate = new Date();
  currentMonth = this.currentDate.getMonth();
  currentYear = this.currentDate.getFullYear();
  calendar: { date: Date, clases: ClaseEstudiante[] }[][] = [];

  selectedDay: Date | null = null;
  modalDia: { date: Date, clases: ClaseEstudiante[] } | null = null;

  // Para navegación de meses
  get monthName(): string {
    return this.currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  }

  prevMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.currentDate = new Date(this.currentYear, this.currentMonth, 1);
    this.generarCalendario();
  }

  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.currentDate = new Date(this.currentYear, this.currentMonth, 1);
    this.generarCalendario();
  }

  constructor(private http: HttpClient, public router: Router) {}

  ngOnInit() {
    const username = localStorage.getItem('username');
    this.loading = true;
    this.http.get<any[]>(`http://localhost:8000/auth/clases-estudiante/${username}`)
      .subscribe({
        next: (data) => {
          this.clases = data.map(clase => ({
            nombre: clase.tema,
            profesor: clase.profesor_nombres && clase.profesor_apellidos
              ? `${clase.profesor_nombres} ${clase.profesor_apellidos}`
              : (clase.profesor_username || ''),
            horario: `${clase.dia} ${clase.hora}`,
            activa: clase.activa !== false,
            meet_link: clase.meet_link || ''
          }));
          this.generarCalendario();
          this.loading = false;
        },
        error: () => {
          this.error = 'No se pudieron cargar las clases.';
          this.loading = false;
        }
      });
  }

  // Genera la matriz de semanas para el mes actual
  public generarCalendario() {
    const primerDiaMes = startOfMonth(new Date(this.currentYear, this.currentMonth));
    const ultimoDiaMes = endOfMonth(primerDiaMes);
    const semanas: { date: Date, clases: ClaseEstudiante[] }[][] = [];
    let semana: { date: Date, clases: ClaseEstudiante[] }[] = [];
    let dia = primerDiaMes;
    // Ajusta para que la semana inicie en lunes
    let offset = (getDay(dia) + 6) % 7;
    for (let i = 0; i < offset; i++) {
      semana.push({ date: null as any, clases: [] });
    }
    while (dia <= ultimoDiaMes) {
      const clasesDelDia = this.clases.filter(clase => {
        // Si el horario es tipo fecha, compara con el día
        const fechaClase = clase.horario.split(' ')[0];
        return format(dia, 'yyyy-MM-dd') === fechaClase;
      });
      semana.push({ date: new Date(dia), clases: clasesDelDia });
      if (semana.length === 7) {
        semanas.push(semana);
        semana = [];
      }
      dia = addDays(dia, 1);
    }
    if (semana.length > 0) {
      while (semana.length < 7) semana.push({ date: null as any, clases: [] });
      semanas.push(semana);
    }
    this.calendar = semanas;
    // Si el día seleccionado no está en el mes actual, lo deselecciona
    if (this.selectedDay && (this.selectedDay.getMonth() !== this.currentMonth || this.selectedDay.getFullYear() !== this.currentYear)) {
      this.selectedDay = null;
    }
  }

  onDayClick(date: Date | null) {
    if (!date) return;
    if (this.selectedDay && date.getTime() === this.selectedDay.getTime()) {
      this.selectedDay = null; // deselecciona si ya está seleccionado
    } else {
      this.selectedDay = date;
    }
  }

  openClasesModal(dia: { date: Date, clases: ClaseEstudiante[] }) {
    if (dia && dia.date && dia.clases && dia.clases.length) {
      this.modalDia = dia;
    }
  }

  closeClasesModal() {
    this.modalDia = null;
  }

  isToday(date: Date | null): boolean {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  isActive(path: string): boolean {
    return this.router.url === path;
  }

  // Utilidad para extraer el día de la clase (asume que clase.horario inicia con el día en español)
  getDiaClase(clase: ClaseEstudiante): string {
    // Ejemplo: "Lunes 10:00" o "2025-08-22 14:10" (si es fecha, puedes parsear a día)
    // Si tienes el día como string, extrae la palabra
    const partes = clase.horario.split(' ');
    const dia = partes[0].toLowerCase();
    // Normaliza tildes
    return dia
      .replace('á', 'a')
      .replace('é', 'e')
      .replace('í', 'i')
      .replace('ó', 'o')
      .replace('ú', 'u');
  }

  // Devuelve las clases del día seleccionado
  clasesDelDiaSeleccionado(): ClaseEstudiante[] {
    if (!this.selectedDay) return [];
    for (const semana of this.calendar) {
      for (const dia of semana) {
        if (dia.date && this.selectedDay && dia.date.getTime() === this.selectedDay.getTime()) {
          return dia.clases;
        }
      }
    }
    return [];
  }
}
