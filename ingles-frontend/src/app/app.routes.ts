// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { RoleGuard } from './auth/role.guard';
import { EmailVerifiedGuard } from './auth/email-verified.guard';
import { RegisterComponent } from './auth/register/register';
import { VerifyEmailComponent } from './auth/verify-email/verify-email';
import { EmailVerifiedSuccessComponent } from './auth/email-verified-success/email-verified-success';
import { LoginComponent } from './auth/login/login'; // <--- Importa el componente de Login
import { DashboardComponent } from './auth/dashboard/dashboard'
import { DashboardEstudiante } from './dashboard-estudiante/dashboard-estudiante';
import { DashboardEmpresaComponent } from './dashboard-empresa/dashboard-empresa';
import { EmpresaAsistenciasComponent } from './empresa-asistencias/empresa-asistencias.component';
import { HomeResumenComponent } from './dashboard-empresa/home-resumen.component';
import { DashboardProfesorComponent } from './dashboard-profesor/dashboard-profesor.component';
import { ProfesorCalificarComponent } from './profesor-calificar/profesor-calificar.component';
import { MisClasesComponent } from './mis-clases/mis-clases.component';
import { PlaneadorComponent } from './planeador/planeador.component';
import { TareasProfesorComponent } from './tareas-profesor/tareas-profesor.component';
import { LayoutProfesorComponent } from './layout-profesor/layout-profesor.component';
import { HomeComponent } from './home/home';
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
import { BenDashboard } from './ben-dashboard/ben-dashboard';
import { IefDashboard } from './ief-dashboard/ief-dashboard';
import { ExpDashboard } from './exp-dashboard/exp-dashboard';
import { IpcDashboard } from './ipc-dashboard/ipc-dashboard';
import { EteDashboard } from './ete-dashboard/ete-dashboard';
import { Nosotros } from './nosotros/nosotros';
import { AdminDashboardComponent } from './admin/admin-dashboard.component';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password';
import { ResetPasswordComponent } from './auth/reset-password/reset-password';
import { TareasUnidadComponent } from './tareas-unidad/tareas-unidad.component';
import { QuizzesListaComponent } from './dashboard-evaluaciones/quizzes-lista.component';
import { QuizFormComponent } from './dashboard-evaluaciones/quiz-form.component';
import { QuizAsignarComponent } from './dashboard-evaluaciones/quiz-asignar.component';
import { QuizPermisosComponent } from './dashboard-evaluaciones/quiz-permisos.component';
import { EvaluacionesListaEstudianteComponent } from './evaluaciones-estudiante/evaluaciones-lista-estudiante.component';
import { EvaluacionRendirComponent } from './evaluaciones-estudiante/evaluacion-rendir.component';
import { GradingTestComponent } from './grading-test/grading-test.component';


export const routes: Routes = [
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'auth/verify-email', component: VerifyEmailComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'email-verified-success', component: EmailVerifiedSuccessComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [EmailVerifiedGuard] },
  {
    path: 'dashboard-estudiante',
    component: DashboardEstudiante,
    canActivate: [EmailVerifiedGuard, RoleGuard, MatriculaGuard],
    data: { expectedRole: 'estudiante' },
    children: [
      { path: 'unidades', component: UnidadesComponent },
      { path: 'unidades/:id', component: UnidadDetalleComponent },
      { path: 'unidades/:id/subcarpeta/:sub', component: SubcarpetaDetalleComponent },
      { path: 'tareas-unidad/:unidadId', component: TareasUnidadComponent },
      { path: 'evaluaciones', component: EvaluacionesListaEstudianteComponent },
      { path: 'evaluaciones/:id', component: EvaluacionRendirComponent },
      { path: 'planeador', component: PlaneadorComponent },
      { path: 'analisis-estudiante', component: AnalisisEstudianteComponent },
      { path: 'analisis-estudiante/:username', component: AnalisisEstudianteComponent },
    ]
  },
  {
    path: 'dashboard-empresa',
    component: DashboardEmpresaComponent,
    canActivate: [EmailVerifiedGuard, RoleGuard],
    data: { expectedRole: 'empresa' },
    children: [
      { path: '', component: HomeResumenComponent },
      { path: 'quizzes', component: QuizzesListaComponent },
      { path: 'quizzes/nuevo', component: QuizFormComponent },
      { path: 'quizzes/:id/editar', component: QuizFormComponent },
      { path: 'quizzes/:id/asignar', component: QuizAsignarComponent },
      { path: 'quizzes/:id/permisos', component: QuizPermisosComponent },
      { path: 'unidades', component: UnidadesComponent },
      { path: 'unidades/:id', component: UnidadDetalleComponent },
      { path: 'unidades/:id/subcarpeta/:sub', component: SubcarpetaDetalleComponent },
      { path: 'tareas-unidad/:unidadId', component: TareasUnidadComponent },
      { path: 'mis-profes', component: MisProfesComponent },
      { path: 'estudiantes', component: EstudiantesComponent },
      { path: 'matriculas', component: MatriculasComponent },
      { path: 'analisis-estudiante', component: AnalisisEstudianteComponent },
      { path: 'analisis-estudiante/:username', component: AnalisisEstudianteComponent },
      { path: 'asistencias', component: EmpresaAsistenciasComponent },
      { path: 'grading-test', component: GradingTestComponent },
      { path: 'unidades/:id', component: UnidadDetalleComponent },
      { path: 'unidades/:id/subcarpeta/:sub', component: SubcarpetaDetalleComponent },
      
    ]
  },
  {
    path: 'dashboard-profesor',
    component: LayoutProfesorComponent,
    canActivate: [RoleGuard],
    data: { expectedRole: 'profesor' },
    children: [
      { path: '', component: DashboardProfesorComponent },
      { path: 'quizzes', component: QuizzesListaComponent },
      { path: 'quizzes/nuevo', component: QuizFormComponent },
      { path: 'quizzes/:id/editar', component: QuizFormComponent },
      { path: 'quizzes/:id/asignar', component: QuizAsignarComponent },
      { path: 'quizzes/:id/permisos', component: QuizPermisosComponent },
      { path: 'mis-clases', component: MisClasesComponent },
      { path: 'planeador', component: PlaneadorComponent },
      { path: 'tareas', component: TareasProfesorComponent },
      { path: 'calificar', component: ProfesorCalificarComponent },
      { path: 'tareas-unidad/:unidadId', component: TareasUnidadComponent },
      { path: 'unidades', component: UnidadesComponent },
      { path: 'unidades/:id', component: UnidadDetalleComponent },
      { path: 'unidades/:id/subcarpeta/:sub', component: SubcarpetaDetalleComponent },
      { path: 'analisis-estudiante', component: AnalisisEstudianteComponent },
      { path: 'analisis-estudiante/:username', component: AnalisisEstudianteComponent },
      { path: 'grading-test', component: GradingTestComponent },
    ]
  },
  { path: 'home', component: HomeComponent },
  { path: 'nosotros', component: Nosotros },
  { path: 'dashboard-mis-clases-estudiante', component: DashboardMisClasesEstudianteComponent },
  { path: 'analisis-estudiante', component: AnalisisEstudianteComponent },
  { path: 'programas', component: ProgramasComponent },
  { path: 'ben', component: BenDashboard },
  { path: 'ief', component: IefDashboard },
  { path: 'exp', component: ExpDashboard },
  { path: 'ipc', component: IpcDashboard },
  { path: 'ete', component: EteDashboard },
  { path: 'admin', component: AdminDashboardComponent, canActivate: [EmailVerifiedGuard, RoleGuard], data: { expectedRole: 'admin' } },
  { path: 'matricula-inactiva', component: MatriculaInactivaComponent },
];