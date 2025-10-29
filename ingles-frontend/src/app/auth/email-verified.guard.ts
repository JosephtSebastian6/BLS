import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class EmailVerifiedGuard implements CanActivate {
  constructor(private router: Router) {}

  private isVerified(user: any): boolean {
    // Aceptar múltiples posibles nombres de campo para compatibilidad
    return Boolean(
      user?.email_verified === true ||
      user?.is_verified === true ||
      user?.verified === true ||
      user?.emailVerificado === true ||
      user?.correo_verificado === true ||
      // algunos backends devuelven fechas o strings
      (typeof user?.email_verified === 'string' && user.email_verified.toLowerCase() === 'true') ||
      (typeof user?.is_verified === 'string' && user.is_verified.toLowerCase() === 'true')
    );
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    const userRaw = localStorage.getItem('user');
    let user: any = {};
    try { user = userRaw ? JSON.parse(userRaw) : {}; } catch { user = {}; }

    // Si no hay usuario logueado, redirigir a login
    if (!user || !user.username) {
      return this.router.parseUrl('/login');
    }

    // Si está verificado, permitir
    if (this.isVerified(user)) {
      return true;
    }

    // No verificado: redirigir a la pantalla de verificación con mensaje y next url
    const next = encodeURIComponent(state.url || '/');
    return this.router.parseUrl(`/auth/verify-email?next=${next}`);
  }
}
