import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { AnalyticsService } from '../services/analytics.service';
import { environment } from '../../environments/environment';

interface TareaFile {
  filename: string;
  original_name: string;
  size: number;
  upload_date: string;
  score?: number | null;
  feedback?: string | null;
}

@Component({
  selector: 'app-tareas-unidad',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatTableModule, MatButtonModule],
  templateUrl: './tareas-unidad.component.html',
  styleUrls: ['./tareas-unidad.component.css'],
  encapsulation: ViewEncapsulation.None,
  host: { 'class': 'tareas-unidad-host' }
})
export class TareasUnidadComponent implements OnInit {
  unidadId!: number;
  files: TareaFile[] = [];
  loading = false;
  errorMsg = '';
  username: string | null = null;
  alternativas: { unidad_id: number; count: number }[] = [];
  tipoUsuario: string = '';
  profesorUsername: string | null = null;

  private backendBase = `${environment.apiUrl}/auth`;

  displayedColumns = ['original_name', 'upload_date', 'size', 'score', 'feedback', 'actions'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.unidadId = Number(this.route.snapshot.paramMap.get('unidadId'));
    this.username = this.route.snapshot.queryParamMap.get('username');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.tipoUsuario = user?.tipo_usuario || '';
    this.profesorUsername = user?.username || null;
    if (!this.unidadId) {
      this.errorMsg = 'Unidad inválida';
      return;
    }
    this.cargarArchivos();
  }

  cargarArchivos() {
    this.loading = true;
    const obs = this.username
      ? this.analytics.getStudentFilesFor(this.username, this.unidadId)
      : this.analytics.getStudentFiles(this.unidadId, 'SOLO TAREAS');
    obs.subscribe({
      next: (resp: any) => {
        const list = resp?.files || resp || [];
        this.files = (list as TareaFile[]).sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime());
        this.loading = false;
        // Fallback: si empresa/profesor y no hay archivos en esta unidad, sugerir otras unidades con archivos
        if (this.username && this.files.length === 0) {
          this.cargarAlternativas();
        }
      },
      error: (err) => {
        this.errorMsg = err?.error?.detail || 'No se pudieron cargar las tareas.';
        this.loading = false;
      }
    });
  }

  private cargarAlternativas() {
    if (!this.username) return;
    this.analytics.getAllStudentTasksFor(this.username).subscribe({
      next: (resp: any) => {
        const unidades = resp?.unidades || [];
        this.alternativas = unidades.map((u: any) => ({ unidad_id: u.unidad_id, count: (u.files || []).length }))
                                    .filter((x: any) => x.count > 0);
      },
      error: () => {}
    });
  }

  irAUnidad(uid: number) {
    const base = this.router.url.split('/')[1];
    const q = this.username ? { username: this.username } : undefined;
    this.router.navigate([`/${base}/tareas-unidad`, uid], { queryParams: q });
  }

  descargar(file: TareaFile) {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const headers = new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
    const url = `${this.backendBase}/estudiantes/subcarpetas/${this.unidadId}/${encodeURIComponent('SOLO TAREAS')}/files/${encodeURIComponent(file.filename)}`;
    this.http.get(url, { headers, responseType: 'blob' as 'json' }).subscribe({
      next: (blob: any) => {
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob as Blob);
        a.href = objectUrl;
        a.download = file.original_name || file.filename;
        a.click();
        URL.revokeObjectURL(objectUrl);
      },
      error: () => {
        this.errorMsg = 'No se pudo descargar el archivo.';
      }
    });
  }

  back() {
    // Regresar al análisis conservando el dashboard actual
    const base = this.router.url.split('/')[1];
    this.router.navigate([`/${base}/analisis-estudiante`]);
  }

  canEdit(): boolean {
    return this.tipoUsuario === 'profesor' && !!this.username && !!this.profesorUsername;
  }

  guardar(f: TareaFile) {
    if (!this.canEdit() || !this.username || !this.profesorUsername) return;
    const score = Math.max(0, Math.min(100, Number(f.score ?? 0)));
    const feedback = f.feedback || undefined;
    this.analytics
      .gradeStudentTask(this.profesorUsername, this.username, this.unidadId, f.filename, score, feedback)
      .subscribe({
        next: () => {
          this.cargarArchivos();
          alert('Calificación guardada');
        },
        error: (err) => {
          console.error('Error guardando calificación', err);
          alert('No se pudo guardar la calificación');
        },
      });
  }

  // UI helpers
  formatSize(bytes: number | null | undefined): string {
    const b = Number(bytes || 0);
    if (b < 1024) return `${b} B`;
    const kb = b / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(1)} GB`;
  }

  fileIcon(name: string | null | undefined): string {
    const n = (name || '').toLowerCase();
    if (/(\.png|\.jpg|\.jpeg|\.gif|\.webp)$/.test(n)) return '🖼️';
    if (/(\.pdf)$/.test(n)) return '📕';
    if (/(\.docx?|\.odt)$/.test(n)) return '📝';
    if (/(\.pptx?)$/.test(n)) return '📊';
    if (/(\.xlsx?|\.csv)$/.test(n)) return '📈';
    return '📄';
  }

  autoResize(e: Event) {
    const el = e.target as HTMLTextAreaElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }
}
