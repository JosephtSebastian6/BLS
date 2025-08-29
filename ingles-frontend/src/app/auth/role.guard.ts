import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const expectedRole = route.data['expectedRole'];
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    // Si no hay usuario o tipo_usuario, redirige siempre
    if (!user || !user.tipo_usuario) {
      this.router.navigate(['/login']);
      return false;
    }
    // Si el rol es correcto, permite acceso
    if (user.tipo_usuario === expectedRole) {
      // Si ya está en la ruta, no hacer nada especial
      return true;
    }
    // Si el usuario es válido pero el rol no coincide, solo redirige si no está en la ruta protegida
    if (state.url !== this.router.url && state.url !== '/login') {
      this.router.navigate(['/login']);
    }
    // Si está en la ruta protegida pero el rol no coincide, no hacer logout, solo bloquear acceso
    return false;
  }
}
