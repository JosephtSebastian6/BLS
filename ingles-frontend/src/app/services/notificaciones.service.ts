import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
// Configuración de la API
const API_URL = 'http://localhost:8000';

export interface Notificacion {
  id: number;
  tipo: string;
  mensaje: string;
  leida: boolean;
  fecha_creacion: string;
  usuario_id: number;
  usuario_remitente_id?: number;
  unidad_id?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificacionesService {
  private apiUrl = `${API_URL}/auth/notificaciones`;
  private notificacionesSubject = new BehaviorSubject<Notificacion[]>([]);
  private notificacionesNoLeidasSubject = new BehaviorSubject<number>(0);

  notificaciones$ = this.notificacionesSubject.asObservable();
  notificacionesNoLeidas$ = this.notificacionesNoLeidasSubject.asObservable();

  constructor(private http: HttpClient) {}

  private headers() {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    let headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return { headers: new HttpHeaders(headers) };
  }

  // Obtener notificaciones del usuario actual
  cargarNotificaciones(usuarioId: number): void {
    this.http.get<Notificacion[]>(`${this.apiUrl}/usuario/${usuarioId}`, this.headers()).subscribe({
      next: (notificaciones) => {
        this.notificacionesSubject.next(notificaciones);
        this.actualizarContadorNoLeidas(notificaciones);
      },
      error: (error) => console.error('Error al cargar notificaciones', error)
    });
  }

  // Marcar una notificación como leída
  marcarComoLeida(notificacionId: number): Observable<Notificacion> {
    return this.http.put<Notificacion>(`${this.apiUrl}/${notificacionId}/marcar-leida`, {}, this.headers());
  }

  // Marcar todas las notificaciones como leídas
  marcarTodasComoLeidas(usuarioId: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/usuario/${usuarioId}/marcar-todas-leidas`, {}, this.headers());
  }

  // Actualizar el contador de notificaciones no leídas
  private actualizarContadorNoLeidas(notificaciones: Notificacion[]): void {
    const noLeidas = notificaciones.filter(n => !n.leida).length;
    this.notificacionesNoLeidasSubject.next(noLeidas);
  }
}
