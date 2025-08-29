import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, Location } from '@angular/common';


@Component({
  selector: 'app-dashboard-empresa',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './dashboard-empresa.component.html',
  styleUrls: ['./dashboard-empresa.component.css']
})

export class DashboardEmpresaComponent {
  empleadosCount = 0;
  reportesCount = 0;
  empresa = {
    nombre: 'Nombre de la empresa',
    correo: 'correo@empresa.com',
    telefono: '000-000-0000'
  };

  location = inject(Location);
  router = inject(Router);

  isUnidadesRoute(): boolean {
    return this.location.path().includes('/dashboard-empresa/unidades');
  }

  logout() {
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }
}
