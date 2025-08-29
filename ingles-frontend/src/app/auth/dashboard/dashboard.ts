import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Importa CommonModule para directivas comunes
import { RouterLink } from '@angular/router'; // Importa RouterLink si vas a tener enlaces en el dashboard

import { MatFormFieldModule } from '@angular/material/form-field'; // Para el contenedor del input
import { MatInputModule } from '@angular/material/input';         // Para el input en sí
import { MatButtonModule } from '@angular/material/button';       // Para los botones
import { MatCardModule } from '@angular/material/card';           // Opcional: Para una tarjeta de login más bonita


@Component({
  selector: 'app-dashboard',
  standalone: true, // Por defecto en Angular 17+
  imports: [CommonModule, 
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule // Si decides usar MatCard para tarjeta login
  ], // Añade CommonModule y RouterLink
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}