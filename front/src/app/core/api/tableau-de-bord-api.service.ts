import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from './api-client.service';
import { CommandeALivrer, CongesDuTableau, ContratARenouveler } from '../models/tableau-de-bord.model';

@Injectable({ providedIn: 'root' })
export class TableauDeBordApi {
  private api = inject(ApiClient);

  /** Contrats de plus d'1 h dont il reste moins d'1 h. */
  contratsARenouveler(): Observable<ContratARenouveler[]> {
    return this.api.get<ContratARenouveler[]>('/tableau-de-bord/contrats-a-renouveler');
  }

  /** Commandes en retard ou à livrer dans les 2 semaines. */
  commandesALivrer(): Observable<CommandeALivrer[]> {
    return this.api.get<CommandeALivrer[]>('/tableau-de-bord/commandes-a-livrer');
  }

  /** Congés de l'équipe sur les 15 prochains jours. */
  conges(): Observable<CongesDuTableau> {
    return this.api.get<CongesDuTableau>('/tableau-de-bord/conges');
  }
}
