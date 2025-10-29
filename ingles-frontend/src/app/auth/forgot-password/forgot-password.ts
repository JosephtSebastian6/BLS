import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatCardModule],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPasswordComponent {
  form: FormGroup;
  loading = false;
  successMsg = '';
  errorMsg = '';

  private backendBase = 'http://127.0.0.1:8000';

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.form = this.fb.group({
      username: [''],
      email: ['', [Validators.email]]
    });
  }

  submit() {
    this.successMsg = '';
    this.errorMsg = '';
    if (!this.form.value.username && !this.form.value.email) {
      this.errorMsg = 'Ingresa username o email.';
      return;
    }
    this.loading = true;
    const url = `${this.backendBase}/auth/forgot-password`;
    this.http.post(url, this.form.value).subscribe({
      next: (res: any) => {
        this.successMsg = res?.message || 'Si el usuario existe, se enviará un correo con instrucciones.';
        this.loading = false;
      },
      error: (err) => {
        this.errorMsg = err?.error?.detail || 'No se pudo enviar la solicitud.';
        this.loading = false;
      }
    });
  }
}
