import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard-mis-cursos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard-mis-cursos.html',
  styleUrls: ['./dashboard-mis-cursos.css']
})
export class DashboardMisCursos {
  constructor(public router: Router) {}
  cursos = [
    {
      tipo: 'Tutorial',
      fecha: 'Feb 28, 2025',
      clase: 'CLASS TUTORIAL UNIT 4B1 PLUS PB',
      orden: 5,
      unidad: 'UNIT 4B1 PLUS PB',
      ciudad: 'Bogotá',
      medio: 'WEB',
      observaciones: '',
      estado: 'Aprobada'
    },
    // ...más cursos de ejemplo
  ];
}
