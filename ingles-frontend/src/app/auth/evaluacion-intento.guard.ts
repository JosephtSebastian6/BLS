import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { EvaluacionRendirComponent } from '../evaluaciones-estudiante/evaluacion-rendir.component';

@Injectable({ providedIn: 'root' })
export class EvaluacionIntentoGuard implements CanDeactivate<EvaluacionRendirComponent> {
  canDeactivate(component: EvaluacionRendirComponent): boolean {
    // Si no hay intento en curso, permitir siempre
    if (!component || !component['intentoEnCurso']) {
      return true;
    }

    const salir = confirm(
      'Tienes un intento en curso. Si sales ahora, este intento se dará por utilizado y tendrás que usar otro para volver a ingresar. ¿Quieres continuar?'
    );

    return salir;
  }
}
