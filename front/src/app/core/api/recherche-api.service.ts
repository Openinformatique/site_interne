import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from './api-client.service';
import { ResultatRecherche } from '../models/recherche.model';

@Injectable({ providedIn: 'root' })
export class RechercheApi {
  private api = inject(ApiClient);

  /** Clients, commandes et pointages contenant chacun des mots ; `limite` résultats par catégorie (200 au plus). */
  rechercher(q: string, limite: number): Observable<ResultatRecherche> {
    return this.api.get<ResultatRecherche>('/recherche', { q, limite });
  }
}
