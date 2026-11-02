import { Injectable, inject } from '@angular/core';
import { Observable, Subject, tap } from 'rxjs';

import { ApiClient, QueryParams } from './api-client.service';
import { Page } from '../models/api.model';
import {
  CommandeClientOption,
  CommandeDetail,
  CommandeDocument,
  CommandeInput,
  CommandeListItem,
  CommandeSortField,
  CommandeTemps,
} from '../models/commande.model';

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
   * la liste, conservée dans son onglet, ou les commandes d'une fiche client).
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

  get(id: number): Observable<CommandeDetail> {
    return this.api.get<CommandeDetail>(`/commandes/${id}`);
  }

  create(input: CommandeInput): Observable<CommandeDetail> {
    return this.api.post<CommandeDetail>('/commandes', input).pipe(tap(() => this.changedSubject.next()));
  }

  update(id: number, input: CommandeInput): Observable<CommandeDetail> {
    return this.api.put<CommandeDetail>(`/commandes/${id}`, input).pipe(tap(() => this.changedSubject.next()));
  }

  /** Clôture à la date du jour (409 si déjà clôturée). */
  cloturer(id: number): Observable<CommandeDetail> {
    return this.api.post<CommandeDetail>(`/commandes/${id}/cloture`).pipe(tap(() => this.changedSubject.next()));
  }

  temps(id: number): Observable<CommandeTemps> {
    return this.api.get<CommandeTemps>(`/commandes/${id}/temps`);
  }

  documents(id: number): Observable<CommandeDocument[]> {
    return this.api.get<CommandeDocument[]>(`/commandes/${id}/documents`);
  }

  addDocument(id: number, file: File, typeDocument: string, commentaire: string | null): Observable<CommandeDocument> {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('typeDocument', typeDocument);
    if (commentaire) {
      form.append('commentaire', commentaire);
    }
    return this.api.postForm<CommandeDocument>(`/commandes/${id}/documents`, form);
  }

  /** Contenu d'un document (téléchargement ou ouverture dans un onglet). */
  documentFile(id: number, documentId: number): Observable<{ blob: Blob; filename: string }> {
    return this.api.download(`/commandes/${id}/documents/${documentId}/fichier`);
  }

  deleteDocument(id: number, documentId: number): Observable<void> {
    return this.api.delete<void>(`/commandes/${id}/documents/${documentId}`);
  }
}

function toParams(query: ListCommandesQuery): QueryParams {
  const { groupes, ...rest } = query;
  return { ...rest, groupes: groupes?.length ? groupes.join(',') : undefined } as QueryParams;
}
