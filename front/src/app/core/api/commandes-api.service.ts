import { Injectable, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { ApiClient, QueryParams } from './api-client.service';
import { Page } from '../models/api.model';
import { CommandeClientOption, CommandeListItem, CommandeSortField } from '../models/commande.model';

/** Filtres et tri communs à la liste et à l'export Excel. */
export interface CommandesFilterQuery {
  sortBy?: CommandeSortField;
  sortDirection?: 'ASC' | 'DESC';
  search?: string;
  includeClosed?: boolean;
  du?: string;
  au?: string;
  clientId?: number;
  /** Clés GSOC, envoyées séparées par des virgules. */
  groupes?: string[];
  sansGroupe?: boolean;
}

export interface ListCommandesQuery extends CommandesFilterQuery {
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class CommandesApi {
  private api = inject(ApiClient);
  private readonly changedSubject = new Subject<void>();

  /**
   * Émet après chaque création / modification d'une commande (ex. rafraîchir
   * la liste, conservée dans son onglet). Alimenté par l'écran Commande.
   */
  readonly changed$ = this.changedSubject.asObservable();

  list(query: ListCommandesQuery): Observable<Page<CommandeListItem>> {
    return this.api.getPage<CommandeListItem>('/commandes', toParams(query));
  }

  clients(): Observable<CommandeClientOption[]> {
    return this.api.get<CommandeClientOption[]>('/commandes/clients');
  }

  /** Export Excel de toutes les commandes du filtre, dans l'ordre du tri. */
  export(filter: CommandesFilterQuery): Observable<{ blob: Blob; filename: string }> {
    return this.api.download('/commandes/export', toParams(filter));
  }

  notifyChanged(): void {
    this.changedSubject.next();
  }
}

function toParams(query: ListCommandesQuery): QueryParams {
  const { groupes, ...rest } = query;
  return { ...rest, groupes: groupes?.length ? groupes.join(',') : undefined } as QueryParams;
}
