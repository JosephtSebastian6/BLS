import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EstudiantesService, Estudiante } from './estudiantes.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-estudiantes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './estudiantes.component.html',
  styleUrls: ['./estudiantes.component.css']
})
export class EstudiantesComponent implements OnInit {
  estudiantes: Estudiante[] = [];
  estudiantesFiltrados: Estudiante[] = [];
  busqueda: string = '';

  constructor(private estudiantesService: EstudiantesService) {}

  ngOnInit(): void {
    this.estudiantesService.getEstudiantes().subscribe((data) => {
      this.estudiantes = data;
      this.estudiantesFiltrados = data;
    });
  }

  filtrarEstudiantes(): void {
    const filtro = this.busqueda.trim().toLowerCase();
    if (!filtro) {
      this.estudiantesFiltrados = this.estudiantes;
      return;
    }
    this.estudiantesFiltrados = this.estudiantes.filter(est =>
      est.nombres.toLowerCase().includes(filtro) ||
      est.apellidos.toLowerCase().includes(filtro) ||
      est.email.toLowerCase().includes(filtro) ||
      est.username.toLowerCase().includes(filtro)
    );
  }
}
