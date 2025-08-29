

import { Component, Input } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './dashboard-layout.component.html',
  styleUrls: ['./dashboard-layout.component.css']
})
export class DashboardLayoutComponent {
  get unidadesRoute(): string {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user && user.tipo_usuario === 'estudiante') {
      return '/dashboard-estudiante/unidades';
    }
    if (user && user.tipo_usuario === 'profesor') {
      return '/dashboard-profesor/unidades';
    }
    if (user && user.tipo_usuario === 'empresa') {
      return '/dashboard-empresa/unidades';
    }
    return '/unidades';
  }
  get currentUrl(): string {
    return this.router.url;
  }
  @Input() menuItems: any[] = [];
  @Input() activeRoute: string = '';

  constructor(private router: Router) {}

  navigateIfNotCurrent(route: string) {
    if (this.router.url !== route) {
      this.router.navigate([route]);
    }
  }
}
