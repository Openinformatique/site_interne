import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { AuthStore } from './auth.store';

/**
 * Sur un 401 d'une requête « normale » : déclenche un refresh partagé puis
 * rejoue la requête avec le nouveau token. Si le refresh échoue → purge + login.
 */
export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  const isAuthFlow = req.url.includes('/auth/login') || req.url.includes('/auth/refresh');

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthFlow) {
        return throwError(() => error);
      }
      return authStore.refresh().pipe(
        switchMap((token) => next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }))),
        catchError((refreshError) => {
          authStore.clearSession();
          void router.navigate(['/auth/login'], { queryParams: { returnUrl: router.url } });
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
