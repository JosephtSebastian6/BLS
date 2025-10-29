import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AnalyticsService, ResumenResponse, UnidadAnalytics } from '../services/analytics.service';
import { DashboardLayoutComponent } from '../dashboard-layout/dashboard-layout.component';

interface Metrica {
  titulo: string;
  valor: string | number;
  descripcion: string;
}

@Component({
  selector: 'app-analisis-estudiante',
  standalone: true,
  imports: [CommonModule, FormsModule, DashboardLayoutComponent],
  templateUrl: './analisis-estudiante.component.html',
  styleUrls: ['./analisis-estudiante.component.css']
})
export class AnalisisEstudianteComponent implements OnInit {
  tipoUsuario: string = '';
  selectedUsername: string = '';
  estudiantes: any[] = [];
  // Controla si se debe envolver con el layout de estudiante (sidebar)
  useStudentLayout: boolean = false;
  
  // Datos del dashboard
  progreso: number = 0;
  metricas: Metrica[] = [];
  desempeno: any[] = [];
  unidadesProgreso: any[] = [];
  
  // Estados de carga
  cargandoResumen: boolean = false;
  cargandoUnidades: boolean = false;

  constructor(
    private analytics: AnalyticsService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {
    // Detectar tipo de usuario
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.tipoUsuario = user.tipo_usuario || localStorage.getItem('tipo_usuario') || '';
  }

  verTareas(idx: number) {
    const item = this.unidadesProgreso[idx];
    if (!item || !item.unidad_id) return;
    const base = this.router.url.split('/')[1];
    // Estudiante: abre sus propias tareas
    if (this.tipoUsuario === 'estudiante') {
      this.router.navigate([`/${base}/tareas-unidad`, item.unidad_id]);
      return;
    }
    // Empresa/Profesor: requiere un estudiante seleccionado
    const username = this.selectedUsername;
    if (!username) {
      alert('Selecciona un estudiante para ver sus tareas.');
      return;
    }
    // Pasamos el username como query param para que el componente detalle consuma endpoint de empresa
    this.router.navigate([`/${base}/tareas-unidad`, item.unidad_id], { queryParams: { username } });
  }

  ngOnInit() {
    // Definir si usamos el layout del estudiante (para evitar sidebars duplicadas)
    const url = this.router.url;
    const insideDashboardWithSidebar = url.startsWith('/dashboard-empresa') ||
                                       url.startsWith('/dashboard-profesor') ||
                                       url.startsWith('/dashboard-estudiante');
    // Si NO estamos dentro de un dashboard con sidebar, usamos el layout del estudiante
    this.useStudentLayout = !insideDashboardWithSidebar;

    // Verificar si hay un parámetro de usuario en la URL
    this.route.params.subscribe(params => {
      if (params['username']) {
        this.selectedUsername = params['username'];
        this.cargarDatosEstudiante(this.selectedUsername);
      }
    });

    if (this.tipoUsuario === 'estudiante') {
      // Para estudiantes, cargar sus propios datos
      this.cargarDatosEstudiante();
    } else if (this.tipoUsuario === 'empresa' || this.tipoUsuario === 'profesor') {
      // Para empresa/profesor, cargar lista de estudiantes
      this.cargarEstudiantes();
      // Si no hay parámetro de usuario, mostrar datos generales
      if (!this.selectedUsername) {
        this.cargarDatosEstudiante();
      }
    }
  }

  cargarEstudiantes() {
    // Cargar estudiantes reales desde el backend
    this.analytics.getEstudiantesUsernames().subscribe({
      next: (estudiantes) => {
        this.estudiantes = (estudiantes || []).map((est: any) => ({
          username: est.username,
          nombres: est.nombres,
          apellidos: est.apellidos
        }));
      },
      error: (error) => {
        console.error('Error cargando estudiantes:', error);
        this.estudiantes = [];
      }
    });
  }

  cargarDatosEstudiante(username?: string) {
    const targetUser = username || 'current';
    
    this.cargandoResumen = true;
    this.cargandoUnidades = true;

    const usernameResumen = username || (this.tipoUsuario === 'estudiante' ? (JSON.parse(localStorage.getItem('user') || '{}').username || localStorage.getItem('username')) : undefined);
    // Cargar resumen (si se especifica username usar endpoint por usuario, de lo contrario usar "current")
    const resumen$ = usernameResumen ? this.analytics.getResumen(usernameResumen) : this.analytics.getResumenEstudiante();
    resumen$.subscribe({
      next: (resumen: ResumenResponse) => {
        this.progreso = resumen.progreso_general;
        this.metricas = [
          { 
            titulo: 'Unidades completadas', 
            valor: resumen.unidades_completadas, 
            descripcion: 'Total completadas' 
          },
          { 
            titulo: 'Tiempo dedicado', 
            valor: `${Math.floor(resumen.tiempo_dedicado_min / 60)}h ${resumen.tiempo_dedicado_min % 60}m`, 
            descripcion: 'Tiempo total' 
          },
          { 
            titulo: 'Racha de estudio', 
            valor: resumen.racha_dias, 
            descripcion: 'Días seguidos' 
          }
        ];
        
        // Inicializar unidades de progreso
        this.inicializarUnidadesProgreso();
        this.cargandoResumen = false;
      },
      error: (error: any) => {
        console.error('Error cargando resumen:', error);
        this.cargandoResumen = false;
        // Datos de fallback
        this.progreso = 0;
        this.metricas = [
          { titulo: 'Unidades completadas', valor: 0, descripcion: 'Total completadas' },
          { titulo: 'Tiempo dedicado', valor: '0h 0m', descripcion: 'Tiempo total' },
          { titulo: 'Racha de estudio', valor: 0, descripcion: 'Días seguidos' }
        ];
        // Inicializar unidades de progreso incluso en caso de error
        this.inicializarUnidadesProgreso();
      }
    });

    // Cargar analytics por unidad (usar por-usuario si aplica)
    const unidades$ = usernameResumen ? this.analytics.getUnidades(usernameResumen) : this.analytics.getAnalyticsUnidades();
    unidades$.subscribe({
      next: (unidades: any[]) => {
        // 1) Desempeño por unidad (barras simples)
        this.desempeno = (unidades || []).map(u => ({
          nombre: u.nombre || `Unidad ${u.unidad_id}`,
          score: Number(u.porcentaje_completado ?? u.progreso_porcentaje ?? 0)
        }));

        // 2) Tarjetas de "Unidades" (datos reales)
        this.unidadesProgreso = (unidades || []).map(u => {
          const progreso = Number(u.porcentaje_completado ?? u.progreso_porcentaje ?? 0);
          const tiempoMin = Number(u.tiempo_dedicado_min ?? u.tiempo_min ?? 0);
          const score = u.score ?? u.promedio_score ?? u.score_promedio ?? null;
          return {
            nombre: u.nombre || `Unidad ${u.unidad_id}`,
            progreso,
            tiempo: this.formatearMinutos(tiempoMin),
            score: score != null ? Number(score) : null,
            tareas_count: Number(u.tareas_count ?? 0),
            score_promedio: u.score_promedio != null ? Number(u.score_promedio) : (u.promedio_score != null ? Number(u.promedio_score) : null),
            ultima_entrega: u.ultima_entrega || null,
            unidad_id: u.unidad_id
          };
        });
        this.cargandoUnidades = false;
      },
      error: (error: any) => {
        console.error('Error cargando analytics de unidades:', error);
        this.cargandoUnidades = false;
        // Datos de fallback
        this.desempeno = [];
        this.unidadesProgreso = [];
      }
    });
  }

  irAUsuario() {
    if (!this.selectedUsername) {
      alert('Por favor selecciona un estudiante');
      return;
    }
    
    // Navegar con parámetro de usuario para actualizar la URL
    const currentRoute = this.router.url.split('/')[1]; // dashboard-empresa o dashboard-estudiante
    this.router.navigate([`/${currentRoute}/analisis-estudiante`, this.selectedUsername]);
    // Cargar de inmediato para no depender solo de la suscripción a params
    this.cargarDatosEstudiante(this.selectedUsername);
  }

  inicializarUnidadesProgreso() {
    // Fallback: dejar vacío si no hay datos reales
    this.unidadesProgreso = [];
  }

  private formatearMinutos(min: number): string {
    if (!min || min <= 0) return '0m';
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }
}
