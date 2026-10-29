import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { UiAccessService } from './ui-access.service';
import { AuthStore } from '../auth/auth.store';
import { ToastService } from '../../shared/services/toast.service';

/** Bloque l'accès direct par URL à une page dont la clé (route.data.uiAccessKey) est masquée. */
export const uiAccessGuard: CanActivateFn = (route) => {
  const uiAccessService = inject(UiAccessService);
  const authStore = inject(AuthStore);
  const router = inject(Router);
  const toast = inject(ToastService);

  const key = route.data['uiAccessKey'] as string | undefined;

  if (!key || uiAccessService.isVisible(key)) {
    return true;
  }

  toast.error('Cette page ne vous est pas accessible.');
  return router.createUrlTree([authStore.landingRoute()]);
};
