import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from './api-client.service';
import { UserUiAccess } from '../models/ui-access.model';

/** Restrictions d'affichage UI d'un utilisateur (confort d'affichage, pas une sécurité). */
@Injectable({ providedIn: 'root' })
export class UiAccessApi {
  private api = inject(ApiClient);

  get(userId: string): Observable<UserUiAccess> {
    return this.api.get<UserUiAccess>(`/users/${userId}/ui-access`);
  }

  /** Remplace intégralement la configuration (pas un ajout incrémental). */
  replace(userId: string, hiddenElements: string[]): Observable<UserUiAccess> {
    return this.api.put<UserUiAccess>(`/users/${userId}/ui-access`, { hiddenElements });
  }

  /** Supprime toutes les restrictions : tous les éléments redeviennent visibles. */
  reset(userId: string): Observable<void> {
    return this.api.delete<void>(`/users/${userId}/ui-access`);
  }
}
