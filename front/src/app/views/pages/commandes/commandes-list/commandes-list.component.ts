import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, switchMap } from 'rxjs/operators';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import {
  Building2, CalendarDays, Check, ChevronDown, ChevronUp, ChevronsUpDown, ClipboardList, Eye, FileSpreadsheet,
  LayoutGrid, List, LucideAngularModule, Plus, Search, Users, X,
} from 'lucide-angular';

import { CommandesApi, CommandesFilterQuery } from '../../../../core/api/commandes-api.service';
import { ParametresApi } from '../../../../core/api/parametres-api.service';
import { ParametreValue } from '../../../../core/models/client.model';
import { CommandeClientOption, CommandeListItem, CommandeSortField } from '../../../../core/models/commande.model';
import { PaginationMeta } from '../../../../core/models/api.model';
import { TabsService } from '../../../../core/services/tabs.service';
import { UiVisibleDirective } from '../../../../core/ui-access/ui-visible.directive';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageLoaderComponent } from '../../../../shared/components/page-loader/page-loader.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { saveBlob } from '../../../../shared/utils/file-download';
import { frDate, todayIso } from '../../clients/client-fiche/client-fiche.utils';
import { COMMANDES_UI_KEYS } from '../access/commandes-access.keys';

/** Valeur spéciale du filtre de groupe : clients sans groupe. */
const SANS_GROUPE = '__sans_groupe__';

/** Filtres, tri et pagination ; conservés tant que l'onglet reste ouvert. */
interface CommandesListState {
  search: string;
  includeClosed: boolean;
  du: string;
  au: string;
  clientId: number | null;
  groupes: string[];
  sansGroupe: boolean;
  sortBy: CommandeSortField;
  sortDirection: 'ASC' | 'DESC';
  page: number;
  pageSize: number;
}

const MONTANT = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

/**
 * Liste des commandes (menu GESTION › Commandes) — voir ../README.md.
 *
 * Consultation des commandes, ouverture d'une commande ou création dans un
 * onglet, export Excel de la liste filtrée et triée.
 */
@Component({
  selector: 'app-commandes-list',
  imports: [
    ReactiveFormsModule, NgbDropdownModule, LucideAngularModule,
    UiVisibleDirective, EmptyStateComponent, PageLoaderComponent, PaginationComponent,
  ],
  templateUrl: './commandes-list.component.html',
  styleUrl: './commandes-list.component.scss',
})
export class CommandesListComponent {
  private commandesApi = inject(CommandesApi);
  private parametresApi = inject(ParametresApi);
  private tabsService = inject(TabsService);
  private destroyRef = inject(DestroyRef);

  readonly UiKeys = COMMANDES_UI_KEYS;
  readonly icons = {
    Building2, CalendarDays, Check, ChevronDown, ClipboardList, Eye, FileSpreadsheet, LayoutGrid, List, Plus, Search, Users, X,
  };
  readonly frDate = frDate;

  readonly columns: { field: CommandeSortField; label: string; numeric?: boolean }[] = [
    { field: 'client', label: 'Client' },
    { field: 'groupe', label: 'Groupe' },
    { field: 'dateCommande', label: 'Date commande' },
    { field: 'numeroCommande', label: 'N° commande' },
    { field: 'numeroDevis', label: 'N° devis' },
    { field: 'dateDevis', label: 'Date devis' },
    { field: 'delai', label: 'Délai' },
    { field: 'libelle', label: 'Libellé' },
    { field: 'joursPrevus', label: 'Jours prévus', numeric: true },
    { field: 'joursPasses', label: 'Jours passés', numeric: true },
    { field: 'joursCommandes', label: 'Jours commandés', numeric: true },
    { field: 'montant', label: 'Montant', numeric: true },
    { field: 'statut', label: 'Statut' },
  ];

  readonly state = signal<CommandesListState>({
    search: '',
    includeClosed: false,
    du: '',
    au: '',
    clientId: null,
    groupes: [],
    sansGroupe: false,
    sortBy: 'client',
    sortDirection: 'ASC',
    page: 1,
    pageSize: 50,
  });
  readonly commandes = signal<CommandeListItem[]>([]);
  readonly meta = signal<PaginationMeta | null>(null);
  readonly loading = signal(true);
  readonly exporting = signal(false);
  readonly view = signal<'list' | 'grid'>('list');
  readonly periodOpen = signal(false);

  readonly searchControl = new FormControl('', { nonNullable: true });

  // Filtre client : sélection unique, liste filtrable par saisie.
  private readonly clients = signal<CommandeClientOption[]>([]);
  readonly clientSearch = signal('');
  readonly clientOptions = computed(() => {
    const terms = normalize(this.clientSearch()).split(/\s+/).filter(Boolean);
    return this.clients().filter((client) => {
      const label = normalize(`${client.raisonSociale ?? ''} ${client.codeClient ?? ''}`);
      return terms.every((term) => label.includes(term));
    });
  });
  readonly selectedClientLabel = computed(() => {
    const id = this.state().clientId;
    const client = this.clients().find((option) => option.id === id);
    return client ? clientLabel(client) : null;
  });

  private readonly groupValues = signal<ParametreValue[]>([]);
  readonly groupOptions = computed(() => [
    ...this.groupValues().map((value) => ({ key: value.cle, label: value.libelle })),
    { key: SANS_GROUPE, label: 'Sans groupe' },
  ]);
  readonly selectedGroupLabels = computed(() => {
    const { groupes, sansGroupe } = this.state();
    const labels = groupes.map((key) => this.groupValues().find((value) => value.cle === key)?.libelle ?? key);
    return sansGroupe ? [...labels, 'Sans groupe'] : labels;
  });

  readonly countLabel = computed(() => {
    const total = this.meta()?.totalItems ?? 0;
    return `${total} commande${total > 1 ? 's' : ''}`;
  });

  private readonly today = todayIso();
  private readonly reload$ = new Subject<void>();

  constructor() {
    this.parametresApi.values('GSOC').pipe(catchError(() => of([]))).subscribe((values) => this.groupValues.set(values));
    this.loadClients();

    this.searchControl.valueChanges
      .pipe(debounceTime(300), map((value) => value.trim()), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((search) => this.update({ search }));

    // Toute modification de l'état (filtres, tri, page) recharge la liste.
    effect(() => {
      this.state();
      untracked(() => this.reload$.next());
    });

    // Commande créée ou modifiée dans un autre onglet : la liste est rafraîchie.
    this.commandesApi.changed$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.loadClients();
      this.reload$.next();
    });

    this.reload$
      .pipe(
        switchMap(() => {
          this.loading.set(true);
          const s = this.state();
          return this.commandesApi.list({ ...this.filterQuery(), page: s.page, limit: s.pageSize });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => { this.commandes.set(result.items); this.meta.set(result.pagination); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
  }

  // --- Filtres ---------------------------------------------------------------

  /** Met à jour une partie de l'état ; tout changement de filtre ou de tri revient en page 1. */
  private update(changes: Partial<CommandesListState>): void {
    const resetsPage = Object.keys(changes).some((key) => key !== 'page');
    this.state.update((state) => ({ ...state, ...changes, page: changes.page ?? (resetsPage ? 1 : state.page) }));
  }

  toggleClosed(): void {
    this.update({ includeClosed: !this.state().includeClosed });
  }

  closePeriod(): void {
    this.periodOpen.set(false);
    if (this.state().du || this.state().au) {
      this.update({ du: '', au: '' });
    }
  }

  setPeriod(bound: 'du' | 'au', event: Event): void {
    this.update({ [bound]: (event.target as HTMLInputElement).value });
  }

  onClientSearch(event: Event): void {
    this.clientSearch.set((event.target as HTMLInputElement).value);
  }

  selectClient(clientId: number | null): void {
    this.clientSearch.set('');
    this.update({ clientId });
  }

  clientLabel(client: CommandeClientOption): string {
    return clientLabel(client);
  }

  isGroupSelected(key: string): boolean {
    const { groupes, sansGroupe } = this.state();
    return key === SANS_GROUPE ? sansGroupe : groupes.includes(key);
  }

  toggleGroup(key: string): void {
    const { groupes, sansGroupe } = this.state();
    if (key === SANS_GROUPE) {
      this.update({ sansGroupe: !sansGroupe });
      return;
    }
    this.update({ groupes: groupes.includes(key) ? groupes.filter((g) => g !== key) : [...groupes, key] });
  }

  clearGroups(): void {
    this.update({ groupes: [], sansGroupe: false });
  }

  // --- Tri et pagination -----------------------------------------------------

  sortBy(field: CommandeSortField): void {
    const { sortBy, sortDirection } = this.state();
    this.update({ sortBy: field, sortDirection: sortBy === field && sortDirection === 'ASC' ? 'DESC' : 'ASC' });
  }

  sortIcon(field: CommandeSortField) {
    const { sortBy, sortDirection } = this.state();
    if (sortBy !== field) return ChevronsUpDown;
    return sortDirection === 'ASC' ? ChevronUp : ChevronDown;
  }

  ariaSort(field: CommandeSortField): 'ascending' | 'descending' | 'none' {
    const { sortBy, sortDirection } = this.state();
    return sortBy !== field ? 'none' : sortDirection === 'ASC' ? 'ascending' : 'descending';
  }

  onPage(page: number): void {
    this.update({ page });
  }

  onPageSize(pageSize: number): void {
    this.update({ pageSize });
  }

  // --- Actions ---------------------------------------------------------------

  openCommande(commande: CommandeListItem, event?: Event): void {
    event?.stopPropagation();
    this.tabsService.openTab(`/commandes/${commande.id}`, `Commande ${commandeNumero(commande)}`);
  }

  createCommande(): void {
    this.tabsService.openTab('/commandes/nouvelle', 'Nouvelle commande');
  }

  /** Export Excel de toutes les commandes du filtre, dans l'ordre du tri. */
  exportExcel(): void {
    if (this.exporting()) {
      return;
    }
    this.exporting.set(true);
    this.commandesApi
      .export(this.filterQuery())
      .pipe(finalize(() => this.exporting.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe(({ blob, filename }) => saveBlob(blob, filename || `commandes_${todayIso()}.xlsx`));
  }

  // --- Affichage -------------------------------------------------------------

  commandeNumero(commande: CommandeListItem): string {
    return commandeNumero(commande);
  }

  /** Délai dépassé d'une commande en cours. */
  enRetard(commande: CommandeListItem): boolean {
    return !commande.dateCloture && !!commande.delai && commande.delai < this.today;
  }

  jours(value: number | null): string {
    return value === null ? '' : String(Math.round(value * 10000) / 10000).replace('.', ',');
  }

  montant(value: number | null): string {
    return value === null ? '' : MONTANT.format(value);
  }

  private filterQuery(): CommandesFilterQuery {
    const s = this.state();
    return {
      sortBy: s.sortBy,
      sortDirection: s.sortDirection,
      search: s.search || undefined,
      includeClosed: s.includeClosed,
      du: s.du || undefined,
      au: s.au || undefined,
      clientId: s.clientId ?? undefined,
      groupes: s.groupes,
      sansGroupe: s.sansGroupe || undefined,
    };
  }

  private loadClients(): void {
    this.commandesApi.clients().pipe(catchError(() => of([]))).subscribe((clients) => this.clients.set(clients));
  }
}

function commandeNumero(commande: CommandeListItem): string {
  return commande.numeroCommande || commande.numeroDevis || String(commande.id);
}

function clientLabel(client: CommandeClientOption): string {
  return client.raisonSociale || client.codeClient || `Client ${client.id}`;
}

/** Minuscules sans accents (recherche dans la liste des clients). */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
