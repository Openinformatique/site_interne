import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ToastService } from '../../shared/services/toast.service';
import { ApiError } from '../models/api.model';

/**
 * Transforme les erreurs de l'API en toasts. Le corps d'erreur du back est
 * { success:false, error:{ code, message, details? }, meta:{ requestId } } :
 * l'ApiError est donc dans error.error.error.
 * Les 401 sont IGNORÉS ici (gérés par refreshInterceptor). On RE-LÈVE toujours
 * l'erreur pour que les composants puissent réagir (ex. mapping VALIDATION_ERROR).
 */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        return throwError(() => error); // laissé au refreshInterceptor
      }

      const body = error.error as { error?: ApiError; meta?: { requestId?: string } } | undefined;
      const code = body?.error?.code;
      const message = body?.error?.message;

      switch (code) {
        case 'VALIDATION_ERROR':
          toast.warning(message ?? 'Certains champs sont invalides.');
          break; // les details[] sont laissés au formulaire appelant
        case 'ACCESS_DENIED':
          toast.error('Droits insuffisants.');
          break;
        case 'TOO_MANY_REQUESTS':
          toast.error(message ?? 'Trop de requêtes, réessayez dans un instant.');
          break;
        case 'BUSINESS_RULE_VIOLATION':
        case 'EXPORT_TOO_LARGE':
          toast.error(message ?? 'Opération impossible.');
          break;
        case 'RESOURCE_NOT_FOUND':
        case 'RESOURCE_ALREADY_EXISTS':
        case 'CONCURRENT_MODIFICATION':
          break; // gérés par le composant (fiche introuvable / conflit inline / verrouillage optimiste)
        default:
          if (error.status >= 500 || error.status === 0) {
            const requestId = body?.meta?.requestId;
            toast.error(`Une erreur est survenue.${requestId ? ` (réf. ${requestId})` : ''}`);
          } else if (message) {
            toast.error(message);
          }
      }
      return throwError(() => error);
    }),
  );
};
