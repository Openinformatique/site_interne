import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStore } from './auth.store';

/**
 * Ajoute `Authorization: Bearer <token>` sur nos appels API,
 * SAUF /auth/login et /auth/refresh (pas de token à ce stade).
 * Force withCredentials sur /auth/* pour émettre/recevoir le cookie de refresh.
 */
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const token = authStore.accessToken();

  const isAuthEndpoint = req.url.includes('/auth/');
  const skipBearer = req.url.includes('/auth/login') || req.url.includes('/auth/refresh');

  let request = req;
  if (token && !skipBearer) {
    request = request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  if (isAuthEndpoint) {
    request = request.clone({ withCredentials: true });
  }
  return next(request);
};
