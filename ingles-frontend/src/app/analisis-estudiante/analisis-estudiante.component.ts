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
        // Auto-seleccionar el primero si es profesor/empresa y no hay selección
        if ((this.tipoUsuario === 'empresa' || this.tipoUsuario === 'profesor') && !this.selectedUsername && this.estudiantes.length > 0) {
          this.selectedUsername = this.estudiantes[0].username;
          // Cargar datos del primer estudiante para evitar usar el usuario del token
          this.cargarDatosEstudiante(this.selectedUsername);
        }
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
        const clamp = (n: any) => Math.max(0, Math.min(100, Number(n || 0)));
        this.desempeno = (unidades || []).map(u => ({
          nombre: u?.nombre || `Unidad ${u?.unidad_id}`,
          score: clamp(u?.progreso_porcentaje ?? u?.porcentaje_completado)
        }));

        this.unidadesProgreso = (unidades || []).map(u => {
          const progreso = clamp(u?.progreso_porcentaje ?? u?.porcentaje_completado);
          const tiempoMin = Number(u?.tiempo_min ?? u?.tiempo_dedicado_min ?? 0);
          const scoreRaw = u?.score ?? u?.promedio_score ?? u?.score_promedio;
          const scoreNum = scoreRaw != null ? Number(scoreRaw) : null;
          const promedioRaw = u?.score_promedio != null ? u?.score_promedio : u?.promedio_score;
          const promedioNum = promedioRaw != null ? Number(promedioRaw) : null;
          const scoreFinal = u?.score_final != null ? Number(u?.score_final) : null;
          return {
            nombre: u?.nombre || `Unidad ${u?.unidad_id}`,
            progreso,
            tiempo: this.formatearMinutos(tiempoMin),
            score: scoreNum,
            promedio_tareas: promedioNum ?? scoreNum,
            score_final: scoreFinal,
            tareas_count: Number(u?.tareas_count ?? 0),
            score_promedio: promedioNum,
            ultima_entrega: u?.ultima_entrega || null,
            unidad_id: u?.unidad_id
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

  // Color dinámico de barra según progreso: ≥80 verde, 60–79 ámbar, <60 rojo
  colorFor(pct: number | null | undefined): string {
    const p = Number(pct ?? 0);
    if (p >= 80) return 'linear-gradient(90deg, #10b981 0%, #34d399 100%)';
    if (p >= 60) return 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)';
    return 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)';
  }

  // Tooltip con métricas clave de la unidad
  tooltipFor(unidad: any): string {
    const tareas = unidad?.tareas_count ?? 0;
    const tiempo = unidad?.tiempo ?? '0m';
    const prom = unidad?.score_promedio != null ? `${Math.round(unidad.score_promedio)}/100` : '—';
    const ultima = unidad?.ultima_entrega ? new Date(unidad.ultima_entrega).toLocaleString() : '—';
    return `Tareas: ${tareas}\nTiempo: ${tiempo}\nPromedio: ${prom}\nÚltima entrega: ${ultima}`;
  }

  private formatearMinutos(min: number): string {
    if (!min || min <= 0) return '0m';
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }
}
