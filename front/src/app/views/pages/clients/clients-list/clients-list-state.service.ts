import { Injectable, effect, inject, signal } from '@angular/core';

import { AuthStore } from '../../../../core/auth/auth.store';
import { ClientSortField } from '../../../../core/models/client.model';

/** Filtres, tri et pagination de la liste des clients. */
export interface ClientsListState {
  search: string;
  includeInactive: boolean;
  /** Clés GSOC sélectionnées. */
  groupes: string[];
  sansGroupe: boolean;
  sortBy: ClientSortField;
  sortDirection: 'ASC' | 'DESC';
  page: number;
  pageSize: number;
}

export const DEFAULT_CLIENTS_LIST_STATE: ClientsListState = {
  search: '',
  includeInactive: false,
  groupes: [],
  sansGroupe: false,
  sortBy: 'raisonSociale',
  sortDirection: 'ASC',
  page: 1,
  pageSize: 50,
};

/**
 * Mémorise l'état de la liste des clients pendant la session : on le
 * retrouve en revenant sur l'onglet. Remis à zéro à la déconnexion. La vue
 * (liste / tuiles) n'en fait volontairement pas partie : on arrive toujours
 * sur la vue liste.
 */
@Injectable({ providedIn: 'root' })
export class ClientsListStateService {
  private readonly authStore = inject(AuthStore);
  private readonly stateSignal = signal<ClientsListState>({ ...DEFAULT_CLIENTS_LIST_STATE });

  readonly state = this.stateSignal.asReadonly();

  constructor() {
    effect(() => {
      if (this.authStore.currentUser() === null) {
        this.reset();
      }
    });
  }

  /** Met à jour une partie de l'état ; tout changement de filtre revient en page 1. */
  update(changes: Partial<ClientsListState>): void {
    const resetsPage = Object.keys(changes).some((key) => key !== 'page' && key !== 'pageSize');
    this.stateSignal.update((state) => ({
      ...state,
      ...changes,
      page: changes.page ?? (resetsPage || changes.pageSize !== undefined ? 1 : state.page),
    }));
  }

  reset(): void {
    this.stateSignal.set({ ...DEFAULT_CLIENTS_LIST_STATE });
  }
}
