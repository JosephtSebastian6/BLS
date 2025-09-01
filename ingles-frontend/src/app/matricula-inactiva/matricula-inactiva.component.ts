import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-matricula-inactiva',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './matricula-inactiva.component.html',
  styleUrls: ['./matricula-inactiva.component.css']
})
export class MatriculaInactivaComponent {
  constructor(private router: Router) {}

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('tipo_usuario');
    this.router.navigate(['/login']);
  }
}
