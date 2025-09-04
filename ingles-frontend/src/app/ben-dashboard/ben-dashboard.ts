import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ben-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './ben-dashboard.html',
  styleUrl: './ben-dashboard.css'
})
export class BenDashboard {

  formData = {
    nombre: '',
    telefono: '',
    email: '',
    asunto: '',
    mensaje: '',
    terms: false
  };

  enviarAWhatsApp() {
    // Crear el mensaje para WhatsApp
    const mensaje = `*Nueva consulta BEN - Business English Program*

*Nombre/Empresa:* ${this.formData.nombre}
*Teléfono:* ${this.formData.telefono}
*Email:* ${this.formData.email}
*Asunto:* ${this.formData.asunto}

*Mensaje:*
${this.formData.mensaje}

*Programa de interés:* BEN - Business English Program

---
✅ Acepta términos y condiciones`;

    // Codificar el mensaje para URL
    const mensajeCodificado = encodeURIComponent(mensaje);
    
    // Número de WhatsApp
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
      terms: false
    };
  }

}
