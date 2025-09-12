import { Component, OnInit, OnDestroy } from '@angular/core';
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
export class HomeComponent implements OnInit, OnDestroy {

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
    this.startAutoplay();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  // ====== Carrusel simple del header ======
  // Primera imagen: la que ya usas en el hero; las otras 4: la URL que me pasaste (puedes reemplazarlas luego)
  carouselImages: string[] = [
    'https://static.wixstatic.com/media/2dcb45_ad3c716c114f4e9080096d5a7bc7379e~mv2.jpg/v1/fill/w_1920,h_432,al_c,q_85,enc_avif,quality_auto/2dcb45_ad3c716c114f4e9080096d5a7bc7379e~mv2.jpg',
    'https://static.wixstatic.com/media/2dcb45_c4b7b9df8cd94145a6e7e4bb0ea612e4~mv2.png/v1/fill/w_1920,h_432,al_c,q_90,enc_avif,quality_auto/2dcb45_c4b7b9df8cd94145a6e7e4bb0ea612e4~mv2.png',
    'https://static.wixstatic.com/media/2dcb45_c7be2b746dbd4ce6af8cca46064e94ba~mv2.png/v1/fill/w_1920,h_432,al_c,q_90,enc_avif,quality_auto/2dcb45_c7be2b746dbd4ce6af8cca46064e94ba~mv2.png',
    'https://static.wixstatic.com/media/2dcb45_014babe4bad94f0b84ebf91c6e82d9ed~mv2.png/v1/fill/w_1920,h_432,al_c,q_90,enc_avif,quality_auto/2dcb45_014babe4bad94f0b84ebf91c6e82d9ed~mv2.png',
    'https://static.wixstatic.com/media/2dcb45_b1afa91159544a028263b377681f1c0c~mv2.png/v1/fill/w_1920,h_432,al_c,q_90,enc_avif,quality_auto/2dcb45_b1afa91159544a028263b377681f1c0c~mv2.png',
  ];
  // Posiciones de fondo por slide (X Y) — inline para asegurar precedencia
  bgPositions: string[] = [
    '50% 40%', // slide 0
    '50% 75%', // slide 1 (bajar más)
    '50% 70%', // slide 2 (bajar más)
    '50% 38%', // slide 3
    '50% 42%', // slide 4
  ];
  currentSlide = 0;
  private autoplayTimer: any = null;
  autoplayMs = 5000;

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.carouselImages.length;
  }

  prevSlide(): void {
    this.currentSlide = (this.currentSlide - 1 + this.carouselImages.length) % this.carouselImages.length;
  }

  goToSlide(i: number): void {
    this.currentSlide = i;
  }

  startAutoplay(): void {
    this.stopAutoplay();
    this.autoplayTimer = setInterval(() => this.nextSlide(), this.autoplayMs);
  }

  stopAutoplay(): void {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
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
    const numeroWhatsApp = '573014893304';
    
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