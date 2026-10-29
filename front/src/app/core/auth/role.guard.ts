import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStore } from './auth.store';
import { ToastService } from '../../shared/services/toast.service';
import { UserRole } from '../models/enums';

/** Autorise selon route.data.roles (vide = tous). Refus → toast + retour à l'atterrissage du rôle. */
export const roleGuard: CanActivateFn = (route) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  const toast = inject(ToastService);

  const allowed = (route.data['roles'] as UserRole[] | undefined) ?? [];
  const role = authStore.currentUser()?.role;

  if (role && (allowed.length === 0 || allowed.includes(role))) {
    return true;
  }
  toast.error('Droits insuffisants.');
  return router.createUrlTree([authStore.landingRoute()]);
};
