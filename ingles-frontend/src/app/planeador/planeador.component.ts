import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, CommonModule } from '@angular/common';

@Component({
  selector: 'app-planeador',
  templateUrl: './planeador.component.html',
  styleUrls: ['./planeador.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule, DatePipe]
})
export class PlaneadorComponent {
  days: string[] = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  hours: string[] = [
    '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM', '12 PM',
    '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM', '9 PM'
  ];
  eventos: { dia: string, hora: string, titulo: string, fecha: Date }[] = [];
  modalVisible = false;
  eventoDia = '';
  eventoHora = '';
  nuevoTitulo = '';

  // Semana actual
  currentDate: Date = new Date();
  weekDates: Date[] = [];

  constructor() {
    this.setWeekDates();
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
    this.nuevoTitulo = '';
    this.modalVisible = true;
  }

  cerrarModal() {
    this.modalVisible = false;
  }

  agregarEvento() {
    if (this.nuevoTitulo.trim()) {
      // Asocia el evento a la fecha de la semana actual
      const fecha = this.weekDates[this.days.indexOf(this.eventoDia)];
      this.eventos.push({ dia: this.eventoDia, hora: this.eventoHora, titulo: this.nuevoTitulo, fecha });
      this.cerrarModal();
    }
  }

  obtenerEventos(dia: string, hora: string) {
    const fecha = this.weekDates[this.days.indexOf(dia)];
    return this.eventos.filter(e => e.dia === dia && e.hora === hora && e.fecha.getTime() === fecha.getTime());
  }
}
