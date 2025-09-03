import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AnalyticsService, ResumenResponse, UnidadAnalytics } from '../services/analytics.service';

interface Metrica {
  titulo: string;
  valor: string | number;
  descripcion: string;
}

@Component({
  selector: 'app-analisis-estudiante',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './analisis-estudiante.component.html',
  styleUrls: ['./analisis-estudiante.component.css']
})
export class AnalisisEstudianteComponent implements OnInit {
  tipoUsuario: string = '';
  selectedUsername: string = '';
  estudiantes: any[] = [];
  
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
    private router: Router
  ) {
    // Detectar tipo de usuario
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.tipoUsuario = user.tipo_usuario || localStorage.getItem('tipo_usuario') || '';
  }

  ngOnInit() {
    if (this.tipoUsuario === 'estudiante') {
      // Para estudiantes, cargar sus propios datos
      this.cargarDatosEstudiante();
    } else if (this.tipoUsuario === 'empresa' || this.tipoUsuario === 'profesor') {
      // Para empresa/profesor, cargar lista de estudiantes
      this.cargarEstudiantes();
    }
  }

  cargarEstudiantes() {
    // TODO: Implementar endpoint para obtener lista de estudiantes
    this.estudiantes = [
      { username: 'sebastian' },
      { username: 'maria' },
      { username: 'carlos' }
    ];
  }

  cargarDatosEstudiante(username?: string) {
    const targetUser = username || 'current';
    
    this.cargandoResumen = true;
    this.cargandoUnidades = true;

    // Cargar resumen
    this.analytics.getResumenEstudiante().subscribe({
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

    // Cargar analytics por unidad
    this.analytics.getAnalyticsUnidades().subscribe({
      next: (unidades: UnidadAnalytics[]) => {
        this.desempeno = unidades.map(u => ({
          nombre: `Unidad ${u.unidad_id}`,
          score: u.progreso_porcentaje
        }));
        this.cargandoUnidades = false;
      },
      error: (error: any) => {
        console.error('Error cargando analytics de unidades:', error);
        this.cargandoUnidades = false;
        // Datos de fallback
        this.desempeno = [];
      }
    });
  }

  irAUsuario() {
    if (!this.selectedUsername) {
      alert('Por favor selecciona un estudiante');
      return;
    }
    
    // TODO: Implementar navegación con parámetro de usuario
    this.cargarDatosEstudiante(this.selectedUsername);
  }

  inicializarUnidadesProgreso() {
    // Datos de ejemplo basados en las unidades existentes
    this.unidadesProgreso = [
      {
        nombre: 'Unidad 1 - Introducción a la empresa',
        progreso: 85,
        tiempo: '2h 30m',
        score: 85
      },
      {
        nombre: 'Unidad 2 - Procesos internos',
        progreso: 65,
        tiempo: '1h 45m',
        score: 72
      },
      {
        nombre: 'Unidad 3 - Recursos Humanos',
        progreso: 40,
        tiempo: '45m',
        score: 58
      },
      {
        nombre: 'Unidad 4 - Proyectos',
        progreso: 15,
        tiempo: '20m',
        score: 35
      }
    ];
  }
}
