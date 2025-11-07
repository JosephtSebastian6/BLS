import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';
import { NotificacionesService } from '../../services/notificaciones.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-campana-notificaciones',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './campana-notificaciones.component.html',
  styleUrls: ['./campana-notificaciones.component.css'],
  providers: [DatePipe]
})
export class CampanaNotificacionesComponent implements OnInit, OnDestroy {
  notificaciones: any[] = [];
  contadorNoLeidas = 0;
  mostrarNotificaciones = false;
  private subscripciones = new Subscription();

  constructor(private notificacionesService: NotificacionesService) {}

  ngOnInit() {
    this.cargarNotificaciones();
  }

  ngOnDestroy() {
    this.subscripciones.unsubscribe();
  }

  cargarNotificaciones() {
    const usuarioId = this.obtenerIdUsuarioActual();
    if (usuarioId) {
      this.subscripciones.add(
        this.notificacionesService.cargarNotificaciones(usuarioId)
      );
      
      this.subscripciones.add(
        this.notificacionesService.notificaciones$.subscribe(notifs => {
          this.notificaciones = notifs;
          this.contadorNoLeidas = notifs.filter(n => !n.leida).length;
        })
      );
    }
  }

  alternarNotificaciones() {
    this.mostrarNotificaciones = !this.mostrarNotificaciones;
  }

  marcarComoLeida(notificacionId: number, evento: Event) {
    evento.stopPropagation();
    this.subscripciones.add(
      this.notificacionesService.marcarComoLeida(notificacionId).subscribe({
        next: () => this.cargarNotificaciones(),
        error: (error) => console.error('Error al marcar como leída', error)
      })
    );
  }

  marcarTodasComoLeidas() {
    const usuarioId = this.obtenerIdUsuarioActual();
    if (usuarioId && this.contadorNoLeidas > 0) {
      this.subscripciones.add(
        this.notificacionesService.marcarTodasComoLeidas(usuarioId).subscribe({
          next: () => this.cargarNotificaciones(),
          error: (error) => console.error('Error al marcar todas como leídas', error)
        })
      );
    }
  }

  private obtenerIdUsuarioActual(): number | null {
    // Se usa la misma clave que el resto de la app: 'user'. Fallback a 'currentUser'.
    const raw = localStorage.getItem('user') || localStorage.getItem('currentUser') || '{}';
    try {
      const usuario = JSON.parse(raw);
      // Preferimos 'identificador' porque backend usa registro.identificador
      return usuario?.identificador || usuario?.id || null;
    } catch {
      return null;
    }
  }
}
