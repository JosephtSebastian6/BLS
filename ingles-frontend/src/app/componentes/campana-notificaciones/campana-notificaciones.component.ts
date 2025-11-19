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
    console.log('🔔 DEBUG: Intentando marcar todas como leídas - usuarioId:', usuarioId, 'noLeidas:', this.contadorNoLeidas);
    
    if (!usuarioId) {
      console.error('❌ No se pudo obtener el ID del usuario');
      alert('Error: No se pudo identificar al usuario. Por favor, vuelve a iniciar sesión.');
      return;
    }
    
    if (this.contadorNoLeidas === 0) {
      console.log('ℹ️ No hay notificaciones por marcar');
      return;
    }
    
    this.subscripciones.add(
      this.notificacionesService.marcarTodasComoLeidas(usuarioId).subscribe({
        next: (response) => {
          console.log('✅ Notificaciones marcadas exitosamente:', response);
          this.cargarNotificaciones();
        },
        error: (error) => {
          console.error('❌ Error al marcar todas como leídas:', error);
          
          let mensaje = 'Error desconocido';
          if (error.status === 401) {
            mensaje = 'Sesión expirada. Por favor, vuelve a iniciar sesión.';
          } else if (error.status === 403) {
            mensaje = 'No tienes permisos para realizar esta acción.';
          } else if (error.status === 404) {
            mensaje = 'Usuario no encontrado.';
          } else if (error.error?.detail) {
            mensaje = error.error.detail;
          }
          
          alert(`Error: ${mensaje}`);
        }
      })
    );
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
