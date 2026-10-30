import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient, QueryParams } from './api-client.service';
import { Page } from '../models/api.model';
import { ClientSortField, ClientSummary } from '../models/client.model';

export interface ListClientsQuery {
  page?: number;
  limit?: number;
  sortBy?: ClientSortField;
  sortDirection?: 'ASC' | 'DESC';
  search?: string;
  includeInactive?: boolean;
  /** Clés GSOC, envoyées séparées par des virgules. */
  groupes?: string[];
  sansGroupe?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ClientsApi {
  private api = inject(ApiClient);

  list(query: ListClientsQuery): Observable<Page<ClientSummary>> {
    const { groupes, ...rest } = query;
    return this.api.getPage<ClientSummary>('/clients', {
      ...rest,
      groupes: groupes?.length ? groupes.join(',') : undefined,
    } as QueryParams);
  }
}
