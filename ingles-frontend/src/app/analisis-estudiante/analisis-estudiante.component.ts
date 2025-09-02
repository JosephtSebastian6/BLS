import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Metrica {
  titulo: string;
  valor: string | number;
  descripcion: string;
}

@Component({
  selector: 'app-analisis-estudiante',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analisis-estudiante.component.html',
  styleUrls: ['./analisis-estudiante.component.css']
})
export class AnalisisEstudianteComponent {
  // Progreso general (0-100)
  progreso = 62; // ejemplo; luego puede venir del backend

  // Métricas rápidas
  metricas: Metrica[] = [
    { titulo: 'Unidades completadas', valor: 8, descripcion: 'De 13 totales' },
    { titulo: 'Tiempo dedicado', valor: '5h 20m', descripcion: 'Últimos 7 días' },
    { titulo: 'Racha de estudio', valor: 3, descripcion: 'Días seguidos' },
  ];

  // Desempeño por unidad (mock inicial)
  desempeno = [
    { nombre: 'Unidad 1', score: 85 },
    { nombre: 'Unidad 2', score: 72 },
    { nombre: 'Unidad 3', score: 90 },
    { nombre: 'Unidad 4', score: 60 },
  ];
}
