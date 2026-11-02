import { Injectable, inject } from '@angular/core';
import { Observable, Subject, tap } from 'rxjs';

import { ApiClient, QueryParams } from './api-client.service';
import { Page } from '../models/api.model';
import {
  ClientCommande,
  ClientCommandesQuery,
  ClientDetail,
  ClientInput,
  ClientSortField,
  ClientSummary,
  Contact,
  ContactInput,
  Contrat,
  ContratAssistance,
  ContratInput,
  ContratMouvement,
  EditionContratsCriteres,
} from '../models/client.model';

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
  private readonly changedSubject = new Subject<void>();

  /** Émet après chaque création / modification d'un client (ex. rafraîchir la liste). */
  readonly changed$ = this.changedSubject.asObservable();

  list(query: ListClientsQuery): Observable<Page<ClientSummary>> {
    const { groupes, ...rest } = query;
    return this.api.getPage<ClientSummary>('/clients', {
      ...rest,
      groupes: groupes?.length ? groupes.join(',') : undefined,
    } as QueryParams);
  }

  get(id: number): Observable<ClientDetail> {
    return this.api.get<ClientDetail>(`/clients/${id}`);
  }

  create(input: ClientInput): Observable<ClientDetail> {
    return this.api.post<ClientDetail>('/clients', input).pipe(tap(() => this.changedSubject.next()));
  }

  update(id: number, input: ClientInput): Observable<ClientDetail> {
    return this.api.put<ClientDetail>(`/clients/${id}`, input).pipe(tap(() => this.changedSubject.next()));
  }

  contrats(clientId: number): Observable<Contrat[]> {
    return this.api.get<Contrat[]>(`/clients/${clientId}/contrats`);
  }

  mouvements(clientId: number, contratId: number): Observable<ContratMouvement[]> {
    return this.api.get<ContratMouvement[]>(`/clients/${clientId}/contrats/${contratId}/mouvements`);
  }

  /** Contrats proposés à l'édition groupée (Pointages › Éditions › Contrats d'assistance). */
  contratsAssistance(): Observable<ContratAssistance[]> {
    return this.api.get<ContratAssistance[]>('/contrats-assistance');
  }

  /** Zip des « Suivi du contrat » arrêtés à une date (un PDF par contrat). */
  editionContrats(criteres: EditionContratsCriteres): Observable<{ blob: Blob; filename: string }> {
    return this.api.download('/contrats-assistance/edition.zip', {
      arreteAu: criteres.arreteAu,
      groupe: criteres.groupe ?? undefined,
      clientId: criteres.clientId ?? undefined,
      contratId: criteres.contratId ?? undefined,
    });
  }

  /** Édition PDF « Suivi du contrat d'assistance ». */
  suiviContratPdf(clientId: number, contratId: number): Observable<{ blob: Blob; filename: string }> {
    return this.api.download(`/clients/${clientId}/contrats/${contratId}/suivi.pdf`);
  }

  saveContrat(clientId: number, contratId: number | null, input: ContratInput): Observable<Contrat> {
    return contratId === null
      ? this.api.post<Contrat>(`/clients/${clientId}/contrats`, input)
      : this.api.put<Contrat>(`/clients/${clientId}/contrats/${contratId}`, input);
  }

  contacts(clientId: number): Observable<Contact[]> {
    return this.api.get<Contact[]>(`/clients/${clientId}/contacts`);
  }

  saveContact(clientId: number, contactId: number | null, input: ContactInput): Observable<Contact> {
    return contactId === null
      ? this.api.post<Contact>(`/clients/${clientId}/contacts`, input)
      : this.api.put<Contact>(`/clients/${clientId}/contacts/${contactId}`, input);
  }

  commandes(clientId: number, query: ClientCommandesQuery): Observable<ClientCommande[]> {
    return this.api.get<ClientCommande[]>(`/clients/${clientId}/commandes`, { ...query } as QueryParams);
  }
}
