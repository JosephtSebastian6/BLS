import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  message = '';
  query = '';
  usuarios: any[] = [];
  filtroRol: string = 'todos';
  page = 1;
  pageSize = 10;
  private backendBase = environment.apiUrl;

  constructor(private http: HttpClient) {}

  get token(): string | null {
    return localStorage.getItem('token');
  }

  private authHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.token}` });
  }

  ngOnInit(): void {
    // Traer todos los usuarios al cargar
    this.buscar(true);
  }

  pingAdmin() {
    if (!this.token) { this.message = 'Inicia sesión como admin.'; return; }
    this.http.get(`${this.backendBase}/auth/admin/ping`, { headers: this.authHeaders() })
      .subscribe({
        next: (res: any) => this.message = `OK: ${res?.message || 'pong'}`,
        error: (err) => this.message = `Error: ${err?.error?.detail || 'verifica token'}`
      });
  }

  buscar(all = false) {
    if (!this.token) { this.message = 'Inicia sesión como admin.'; return; }
    const base = `${this.backendBase}/auth/admin/usuarios`;
    const finalUrl = (all || !this.query?.trim())
      ? base
      : `${base}?q=${encodeURIComponent(this.query.trim())}`;
    this.http.get<any[]>(finalUrl, { headers: this.authHeaders() })
      .subscribe({
        next: (rows) => { this.usuarios = rows.map(r => ({ ...r, _nuevoRol: r.tipo_usuario })); this.page = 1; this.message = `Encontrados: ${rows.length}`; },
        error: (err) => { this.message = err?.error?.detail || 'Error al listar usuarios'; this.usuarios = []; }
      });
  }

  cambiarRol(u: any) {
    if (!u?._nuevoRol || u._nuevoRol === u.tipo_usuario) { this.message = 'Selecciona un rol diferente.'; return; }
    this.http.put(
      `${this.backendBase}/auth/admin/usuarios/${encodeURIComponent(u.username)}/rol`,
      { tipo_usuario: u._nuevoRol },
      { headers: this.authHeaders() }
    ).subscribe({
      next: (res: any) => { u.tipo_usuario = res?.tipo_usuario; this.message = `Rol actualizado a '${u.tipo_usuario}'`; },
      error: (err) => { this.message = err?.error?.detail || 'Error al cambiar rol'; }
    });
  }

  // Filtros y paginación
  get filtrados(): any[] {
    if (this.filtroRol === 'todos') return this.usuarios;
    return this.usuarios.filter(u => u.tipo_usuario === this.filtroRol);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtrados.length / this.pageSize));
  }

  get pagedUsuarios(): any[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filtrados.slice(start, start + this.pageSize);
  }

  setPage(p: number) {
    this.page = Math.min(Math.max(1, p), this.totalPages);
  }
}
