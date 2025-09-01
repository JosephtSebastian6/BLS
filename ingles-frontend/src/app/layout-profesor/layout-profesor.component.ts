import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-layout-profesor',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout-profesor.component.html',
  styleUrls: ['./layout-profesor.component.css']
})
export class LayoutProfesorComponent {
  constructor(private router: Router) {}

  irAMisClases() {
    this.router.navigate(['/dashboard-profesor/mis-clases']);
  }

  irAMiPerfil() {
    this.router.navigate(['/dashboard-profesor']);
  }

  isPerfilActive(): boolean {
    return this.router.url === '/dashboard-profesor' || this.router.url === '/dashboard-profesor/';
  }

  isClasesActive(): boolean {
    return this.router.url.includes('/dashboard-profesor/mis-clases');
  }
}
