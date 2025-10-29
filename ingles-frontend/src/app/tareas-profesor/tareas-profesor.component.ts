import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ProfesorTareasService } from '../services/profesor-tareas.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tareas-profesor',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './tareas-profesor.component.html',
  styleUrls: ['./tareas-profesor.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TareasProfesorComponent implements OnInit {
  unidadId: number | null = null;
  desde = '';
  hasta = '';
  loading = false;
  error = '';
  profesorUsername = '';
  data: Array<{ estudiante_username: string; nombres: string; apellidos: string; tareas: any[] }> = [];

  constructor(private svc: ProfesorTareasService, private cdr: ChangeDetectorRef, private router: Router) {}

  ngOnInit(): void {
    const username = localStorage.getItem('username');
    if (username) this.profesorUsername = username;
    const hoy = new Date();
    const hace30 = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
    this.desde = hace30.toISOString().slice(0, 10);
    this.hasta = hoy.toISOString().slice(0, 10);
    this.buscar();
  }

  buscar() {
    if (!this.profesorUsername) { this.error = 'No se encontró el usuario profesor'; return; }
    this.loading = true;
    this.error = '';
    this.svc.getTareasAsignadas(this.profesorUsername, {
      unidadId: this.unidadId ?? undefined,
      desde: this.desde || undefined,
      hasta: this.hasta || undefined,
    }).subscribe({
      next: (rows) => {
        this.data = rows || [];
        // Enriquecer cada tarea con su nota
        for (const e of this.data) {
          for (const t of (e.tareas || [])) {
            if (!t || !t.filename || t.filename === 'grades.json') continue;
            this.svc.getGrade(this.profesorUsername, e.estudiante_username, t.unidad_id, t.filename)
              .subscribe({
                next: (g) => { (t as any)._grade = (g?.score ?? null); this.cdr.markForCheck(); },
                error: () => { (t as any)._grade = null; this.cdr.markForCheck(); }
              });
          }
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (e) => { this.error = 'No se pudo cargar el listado'; this.loading = false; console.error(e); this.cdr.markForCheck(); }
    });
  }

  descargar(estUsername: string, unidadId: number, filename: string) {
    this.svc.download(this.profesorUsername, estUsername, unidadId, filename);
  }

  calificar(estUsername: string, unidadId: number, filename: string) {
    this.router.navigate(['/dashboard-profesor/calificar'], {
      queryParams: {
        estudiante: estUsername,
        unidad: unidadId,
        tipo: 'tarea',
        filename
      }
    });
  }

  bonus(estUsername: string, unidadId: number) {
    const min = Number(prompt('Minutos de asistencia a sumar (opcional):', '15') || '0');
    const addScore = Number(prompt('Puntos de score a sumar (opcional):', '0') || '0');
    this.svc.attendanceBonus(this.profesorUsername, estUsername, unidadId, min, addScore).subscribe({
      next: () => { alert('Bonus aplicado'); this.buscar(); },
      error: (e) => { console.error(e); alert(e?.error?.detail || 'No se pudo aplicar el bonus'); }
    });
  }
}
