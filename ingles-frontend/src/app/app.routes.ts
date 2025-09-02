// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { RoleGuard } from './auth/role.guard';
import { RegisterComponent } from './auth/register/register';
import { VerifyEmailComponent } from './auth/verify-email/verify-email';
import { EmailVerifiedSuccessComponent } from './auth/email-verified-success/email-verified-success';
import { LoginComponent } from './auth/login/login'; // <--- Importa el componente de Login
import { DashboardComponent } from './auth/dashboard/dashboard'
import { DashboardEstudiante } from './dashboard-estudiante/dashboard-estudiante';
import { DashboardMisCursos } from './dashboard-mis-cursos/dashboard-mis-cursos';
import { DashboardEmpresaComponent } from './dashboard-empresa/dashboard-empresa';
import { DashboardProfesorComponent } from './dashboard-profesor/dashboard-profesor.component';
import { MisClasesComponent } from './mis-clases/mis-clases.component';
import { PlaneadorComponent } from './planeador/planeador.component';
import { LayoutProfesorComponent } from './layout-profesor/layout-profesor.component';
import { HomeComponent } from './home/home';
import { DashboardProgresoComponent } from './dashboard-progreso/dashboard-progreso'; // Asegúrate de importar el nuevo componente
import { DashboardMisClasesEstudianteComponent } from './dashboard-mis-clases-estudiante/dashboard-mis-clases-estudiante.component';
import { ProgramasComponent } from './programas/programas.component';
import { UnidadesComponent } from './unidades/unidades.component';
import { UnidadDetalleComponent } from './unidades/detalle/unidad-detalle.component';
import { SubcarpetaDetalleComponent } from './unidades/detalle/subcarpeta-detalle.component';
import { MisProfesComponent } from './mis-profes/mis-profes.component';
import { EstudiantesComponent } from './estudiantes/estudiantes.component';
import { MatriculasComponent } from './matriculas/matriculas.component';
import { MatriculaInactivaComponent } from './matricula-inactiva/matricula-inactiva.component';
import { MatriculaGuard } from './auth/matricula.guard';
import { AnalisisEstudianteComponent } from './analisis-estudiante/analisis-estudiante.component';

export const routes: Routes = [
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  { path: 'auth/verify-email', component: VerifyEmailComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'email-verified-success', component: EmailVerifiedSuccessComponent },
  { path: 'dashboard', component: DashboardComponent },
  {
    path: 'dashboard-estudiante',
    component: DashboardEstudiante,
    canActivate: [RoleGuard, MatriculaGuard],
    data: { expectedRole: 'estudiante' },
    children: [
      { path: 'unidades', component: UnidadesComponent },
      { path: 'unidades/:id', component: UnidadDetalleComponent },
      { path: 'unidades/:id/subcarpeta/:sub', component: SubcarpetaDetalleComponent },
      { path: 'planeador', component: PlaneadorComponent },
      { path: 'analisis-estudiante', component: AnalisisEstudianteComponent },
    ]
  },
  { path: 'dashboard-mis-cursos', component: DashboardMisCursos },
  {
    path: 'dashboard-empresa',
    component: DashboardEmpresaComponent,
    canActivate: [RoleGuard],
    data: { expectedRole: 'empresa' },
    children: [
      { path: 'unidades', component: UnidadesComponent },
      { path: 'unidades/:id', component: UnidadDetalleComponent },
      { path: 'unidades/:id/subcarpeta/:sub', component: SubcarpetaDetalleComponent },
      { path: 'mis-profes', component: MisProfesComponent },
      { path: 'estudiantes', component: EstudiantesComponent },
      { path: 'matriculas', component: MatriculasComponent },
      { path: 'analisis-estudiante', component: AnalisisEstudianteComponent }
    ]
  },
  {
    path: 'dashboard-profesor',
    component: LayoutProfesorComponent,
    canActivate: [RoleGuard],
    data: { expectedRole: 'profesor' },
    children: [
      { path: '', component: DashboardProfesorComponent },
      { path: 'mis-clases', component: MisClasesComponent },
      { path: 'planeador', component: PlaneadorComponent },
      { path: 'unidades', component: UnidadesComponent },
      { path: 'unidades/:id', component: UnidadDetalleComponent },
      { path: 'unidades/:id/subcarpeta/:sub', component: SubcarpetaDetalleComponent },
      { path: 'analisis-estudiante', component: AnalisisEstudianteComponent },
    ]
  },
  { path: 'home', component: HomeComponent },
  { path: 'dashboard-progreso', component: DashboardProgresoComponent },
  { path: 'dashboard-mis-clases-estudiante', component: DashboardMisClasesEstudianteComponent },
  { path: 'programas', component: ProgramasComponent },
  { path: 'matricula-inactiva', component: MatriculaInactivaComponent },
];