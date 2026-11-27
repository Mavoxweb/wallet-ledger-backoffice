import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from './session.store';

/**
 * Guards são conforto: evitam mostrar uma tela que a pessoa não pode usar. A
 * segurança de verdade é a API, que responde 403 para qualquer perfil errado,
 * mesmo chamada direto.
 */
export const staffGuard: CanActivateFn = () =>
  inject(SessionStore).role() ? true : inject(Router).createUrlTree(['/login']);

export const adminGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);
  if (!session.role()) {
    return router.createUrlTree(['/login']);
  }
  return session.isAdmin() ? true : router.createUrlTree(['/contas']);
};

/** A tela de login é para quem ainda não entrou: com sessão, vai direto para as contas. */
export const guestGuard: CanActivateFn = () =>
  inject(SessionStore).role() ? inject(Router).createUrlTree(['/contas']) : true;
