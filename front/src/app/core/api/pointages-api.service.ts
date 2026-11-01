import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from './api-client.service';
import { ClientPointageOptions, Pointage, PointageInput, PointagesReference } from '../models/pointage.model';

@Injectable({ providedIn: 'root' })
export class PointagesApi {
  private api = inject(ApiClient);

  /** Types d'action, tags, personnes sélectionnables et clients actifs. */
  reference(): Observable<PointagesReference> {
    return this.api.get<PointagesReference>('/pointages/reference');
  }

  clientOptions(clientId: number): Observable<ClientPointageOptions> {
    return this.api.get<ClientPointageOptions>(`/pointages/clients/${clientId}/options`);
  }

  /** Pointages d'une personne qui chevauchent [du, au[. */
  list(utilisateurId: string, du: Date, au: Date): Observable<Pointage[]> {
    return this.api.get<Pointage[]>('/pointages', { utilisateurId, du: du.toISOString(), au: au.toISOString() });
  }

  create(input: PointageInput): Observable<Pointage> {
    return this.api.post<Pointage>('/pointages', input);
  }

  update(id: number, input: PointageInput): Observable<Pointage> {
    return this.api.put<Pointage>(`/pointages/${id}`, input);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`/pointages/${id}`);
  }
}
