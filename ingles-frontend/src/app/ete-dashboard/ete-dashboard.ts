import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ete-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './ete-dashboard.html',
  styleUrl: './ete-dashboard.css'
})
export class EteDashboard {

  formData = {
    empresa: '',
    telefono: '',
    email: '',
    asunto: '',
    mensaje: '',
    terms: false
  };

  enviarAWhatsApp() {
    // Crear el mensaje para WhatsApp
    const mensaje = `*Nueva consulta ETE - English Test Empresarial*

*Empresa:* ${this.formData.empresa}
*Teléfono:* ${this.formData.telefono}
*Email:* ${this.formData.email}
*Asunto:* ${this.formData.asunto}

*Mensaje:*
${this.formData.mensaje}

*Programa de interés:* ETE - English Test Empresarial

---
✅ Acepta términos y condiciones`;

    // Codificar el mensaje para URL
    const mensajeCodificado = encodeURIComponent(mensaje);
    
    // Número de WhatsApp
    const numeroWhatsApp = '573014893304';
    
    // Crear URL de WhatsApp
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${mensajeCodificado}`;
    
    // Abrir WhatsApp en nueva ventana
    window.open(urlWhatsApp, '_blank');
    
    // Limpiar el formulario después de enviar
    this.formData = {
      empresa: '',
      telefono: '',
      email: '',
      asunto: '',
      mensaje: '',
      terms: false
    };
  }

}
