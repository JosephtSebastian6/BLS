import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Importa CommonModule para directivas comunes
import { RouterLink } from '@angular/router'; // Importa RouterLink si vas a tener enlaces en el dashboard
import { FormsModule } from '@angular/forms'; // Para ngModel

import { MatButtonModule } from '@angular/material/button';       // Para los botones
import { ProgramasComponent } from '../programas/programas.component'; // Importa ProgramasComponent


@Component({
  selector: 'app-home',
  standalone: true, // Por defecto en Angular 17+
  imports: [CommonModule, 
    RouterLink,
    MatButtonModule,
    ProgramasComponent,
    FormsModule, // Añadir FormsModule para ngModel
     // Si decides usar MatCard para tarjeta login
  ], // Añade CommonModule y RouterLink
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent implements OnInit {

  formData = {
    nombre: '',
    telefono: '',
    email: '',
    asunto: '',
    mensaje: '',
    terms: false,
    data: false
  };

  constructor() { }

  ngOnInit(): void {
  }

  enviarAWhatsApp() {
    // Crear el mensaje para WhatsApp
    const mensaje = `*Nueva consulta desde la web BLS*

*Nombre/Empresa:* ${this.formData.nombre}
*Teléfono:* ${this.formData.telefono}
*Email:* ${this.formData.email}
*Asunto:* ${this.formData.asunto}

*Mensaje:*
${this.formData.mensaje}

---
✅ Acepta términos y condiciones
✅ Autoriza tratamiento de datos`;

    // Codificar el mensaje para URL
    const mensajeCodificado = encodeURIComponent(mensaje);
    
    // Número de WhatsApp (usar el mismo del botón de contacto)
    const numeroWhatsApp = '573153164146';
    
    // Crear URL de WhatsApp
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${mensajeCodificado}`;
    
    // Abrir WhatsApp en nueva ventana
    window.open(urlWhatsApp, '_blank');
    
    // Limpiar el formulario después de enviar
    this.formData = {
      nombre: '',
      telefono: '',
      email: '',
      asunto: '',
      mensaje: '',
      terms: false,
      data: false
    };
  }

}