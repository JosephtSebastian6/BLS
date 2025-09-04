import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ief-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './ief-dashboard.html',
  styleUrl: './ief-dashboard.css'
})
export class IefDashboard {

  formData = {
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    empresa: '',
    mensaje: '',
    terms: false
  };

  enviarAWhatsApp() {
    // Crear el mensaje para WhatsApp
    const mensaje = `*Nueva consulta IEF - Inglés para Entidades Financieras*

*Nombre:* ${this.formData.nombre} ${this.formData.apellido}
*Empresa:* ${this.formData.empresa}
*Teléfono:* ${this.formData.telefono}
*Email:* ${this.formData.email}

*Mensaje:*
${this.formData.mensaje}

*Programa de interés:* IEF - Inglés para Entidades Financieras

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
      apellido: '',
      email: '',
      telefono: '',
      empresa: '',
      mensaje: '',
      terms: false
    };
  }

}
