import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard-progreso',
  standalone: true,
  imports: [RouterModule], // <-- agrega aquí RouterModule
  templateUrl: './dashboard-progreso.html',
  styleUrls: ['./dashboard-progreso.css']
})
export class DashboardProgresoComponent {}