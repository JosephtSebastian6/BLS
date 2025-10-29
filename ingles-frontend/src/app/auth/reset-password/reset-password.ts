import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatCardModule],
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.css']
})
export class ResetPasswordComponent implements OnInit {
  form: FormGroup;
  loading = false;
  successMsg = '';
  errorMsg = '';
  token: string | null = null;

  private backendBase = 'http://127.0.0.1:8000';

  constructor(private fb: FormBuilder, private http: HttpClient, private route: ActivatedRoute, private router: Router) {
    this.form = this.fb.group({
      new_password: ['', [Validators.required, Validators.minLength(6)]],
      confirm_password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(p => this.token = p['token'] || null);
  }

  submit() {
    this.successMsg = '';
    this.errorMsg = '';
    const { new_password, confirm_password } = this.form.value;
    if (!new_password || new_password !== confirm_password) {
      this.errorMsg = 'Las contraseñas no coinciden.';
      return;
    }
    if (!this.token) {
      this.errorMsg = 'Token inválido o ausente.';
      return;
    }
    this.loading = true;
    const url = `${this.backendBase}/auth/reset-password`;
    this.http.post(url, { token: this.token, new_password }).subscribe({
      next: (res: any) => {
        this.successMsg = res?.message || 'Contraseña actualizada correctamente.';
        this.loading = false;
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.errorMsg = err?.error?.detail || 'No se pudo actualizar la contraseña.';
        this.loading = false;
      }
    });
  }
}
