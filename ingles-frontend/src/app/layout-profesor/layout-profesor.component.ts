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
    this.router.navigate(['/mis-clases']);
  }

  irAMiPerfil() {
    this.router.navigate(['/dashboard-profesor']);
  }

  isPerfilActive(): boolean {
    return this.router.url.startsWith('/dashboard-profesor');
  }

  isClasesActive(): boolean {
    return this.router.url.includes('/mis-clases');
  }
}
