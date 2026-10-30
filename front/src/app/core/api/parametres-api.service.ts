import { Injectable, inject } from '@angular/core';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';

import { ApiClient } from './api-client.service';
import { ParametreValue } from '../models/client.model';

/**
 * Lecture du paramétrage (GET /parametres/:codeTable), ex. GSOC (groupes
 * sociétaux), PAYS. Les valeurs changent rarement : chaque table est mise en
 * cache pour la durée de la session.
 */
@Injectable({ providedIn: 'root' })
export class ParametresApi {
  private api = inject(ApiClient);
  private readonly cache = new Map<string, Observable<ParametreValue[]>>();

  values(codeTable: string): Observable<ParametreValue[]> {
    const key = codeTable.toUpperCase();
    let values$ = this.cache.get(key);
    if (!values$) {
      values$ = this.api.get<ParametreValue[]>(`/parametres/${key}`).pipe(
        // Une erreur n'est pas mise en cache : le prochain appel réessaie.
        catchError((error: unknown) => {
          this.cache.delete(key);
          return throwError(() => error);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.cache.set(key, values$);
    }
    return values$;
  }
}
