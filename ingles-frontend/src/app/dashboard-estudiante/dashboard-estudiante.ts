import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { DashboardEstudianteService } from './dashboard-estudiante.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';


@Component({
  selector: 'app-dashboard-estudiante',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard-estudiante.html',
  styleUrls: ['./dashboard-estudiante.css']
})
export class DashboardEstudiante implements OnInit, OnDestroy {
  perfil: any = null;
  mensajeExito = '';
  editandoNombre = false;
  imagenInvalida = false;
  currentUrl = '';
  private routerSubscription: Subscription = new Subscription();
  private backendBase = environment.apiUrl;

  constructor(
    private dashboardEstudianteService: DashboardEstudianteService,
    private http: HttpClient,
    private router: Router
  ) {}

  irAMisCursos() {
    this.router.navigate(['/dashboard-mis-cursos']);
  }

  irAMisClases() {
    this.router.navigate(['/dashboard-mis-clases-estudiante']);
  }

  isMisClasesActive(): boolean {
    return this.router.url === '/dashboard-mis-clases-estudiante';
  }


  ngOnInit(): void {
    // Inicializar la URL actual
    this.currentUrl = this.router.url;
    
    // Suscribirse a cambios de navegación
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentUrl = event.url;
      });
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const username = user.username;
    if (username) {
      this.http.get(`${this.backendBase}/auth/usuario/${username}`)
        .subscribe({
          next: (data) => {
            this.perfil = data;
            this.imagenInvalida = false;
          },
          error: (err) => {
            console.error('Error al obtener datos del usuario:', err);
          }
        });
    }
  }
  onImagenError() {
    this.imagenInvalida = true;
  }

  onImagenInputChange() {
    this.imagenInvalida = false;
  }

  onSubmit() {
    if (!this.perfil) return;
    this.dashboardEstudianteService.actualizarPerfil(this.perfil).subscribe({
      next: (data) => {
        this.perfil = data;
        localStorage.setItem('user', JSON.stringify(data)); // Actualiza localStorage con el nuevo perfil
        this.mensajeExito = '¡Perfil actualizado correctamente!';
        setTimeout(() => this.mensajeExito = '', 3000);
        this.imagenInvalida = false;
      },
      error: () => {
        this.mensajeExito = 'Error al actualizar el perfil.';
        setTimeout(() => this.mensajeExito = '', 3000);
      }
    });
  }

  logout() {
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  public getRouterUrl(): string {
    return this.router.url;
  }

  ngOnDestroy(): void {
    this.routerSubscription.unsubscribe();
  }
}
