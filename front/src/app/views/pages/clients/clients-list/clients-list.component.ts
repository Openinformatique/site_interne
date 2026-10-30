import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import {
  Building2, Check, ChevronDown, ChevronUp, ChevronsUpDown, Eye, LayoutGrid, List, LucideAngularModule, Plus, Search, Users,
} from 'lucide-angular';

import { ClientsApi } from '../../../../core/api/clients-api.service';
import { ParametresApi } from '../../../../core/api/parametres-api.service';
import { ClientSortField, ClientSummary, ParametreValue } from '../../../../core/models/client.model';
import { PaginationMeta } from '../../../../core/models/api.model';
import { TabsService } from '../../../../core/services/tabs.service';
import { UiVisibleDirective } from '../../../../core/ui-access/ui-visible.directive';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageLoaderComponent } from '../../../../shared/components/page-loader/page-loader.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { CLIENTS_UI_KEYS } from '../access/clients-access.keys';
import { ClientsListStateService } from './clients-list-state.service';

/** Valeur spéciale du filtre de groupe : clients sans groupe. */
const SANS_GROUPE = '__sans_groupe__';

interface GroupOption {
  key: string;
  label: string;
  count: number | null;
}

/**
 * Liste des clients (Module clients) — voir ../README.md.
 *
 * Filtres (recherche, inactifs, groupes), tri et pagination sont mémorisés
 * pour la session par ClientsListStateService ; la vue (liste / tuiles) ne
 * l'est pas : on arrive toujours sur la vue liste.
 */
@Component({
  selector: 'app-clients-list',
  imports: [
    ReactiveFormsModule, NgbDropdownModule, LucideAngularModule,
    UiVisibleDirective, EmptyStateComponent, PageLoaderComponent, PaginationComponent,
  ],
  templateUrl: './clients-list.component.html',
  styleUrl: './clients-list.component.scss',
})
export class ClientsListComponent {
  private clientsApi = inject(ClientsApi);
  private parametresApi = inject(ParametresApi);
  private tabsService = inject(TabsService);
  private stateService = inject(ClientsListStateService);
  private destroyRef = inject(DestroyRef);

  readonly UiKeys = CLIENTS_UI_KEYS;
  readonly Building2 = Building2;
  readonly Check = Check;
  readonly ChevronDown = ChevronDown;
  readonly Eye = Eye;
  readonly LayoutGrid = LayoutGrid;
  readonly List = List;
  readonly Plus = Plus;
  readonly Search = Search;
  readonly Users = Users;

  readonly columns: { field: ClientSortField; label: string }[] = [
    { field: 'codeClient', label: 'Code' },
    { field: 'raisonSociale', label: 'Raison sociale' },
    { field: 'groupe', label: 'Groupe' },
    { field: 'actif', label: 'Statut' },
    { field: 'adresse1', label: 'Adresse 1' },
    { field: 'adresse2', label: 'Adresse 2' },
    { field: 'adresse3', label: 'Adresse 3' },
    { field: 'codePostal', label: 'CP' },
    { field: 'ville', label: 'Ville' },
    { field: 'codePays', label: 'Pays' },
  ];

  readonly state = this.stateService.state;
  readonly clients = signal<ClientSummary[]>([]);
  readonly meta = signal<PaginationMeta | null>(null);
  readonly loading = signal(true);
  /** Vue non mémorisée : toujours la liste à l'arrivée. */
  readonly view = signal<'list' | 'grid'>('list');

  readonly searchControl = new FormControl(this.state().search, { nonNullable: true });

  private readonly groupValues = signal<ParametreValue[]>([]);
  private readonly groupCounts = signal<Record<string, number>>({});
  private readonly paysLabels = signal<Record<string, string>>({});

  readonly countLabel = computed(() => {
    const total = this.meta()?.totalItems ?? 0;
    return `${total} client${total > 1 ? 's' : ''}`;
  });

  readonly groupOptions = computed<GroupOption[]>(() => {
    const counts = this.groupCounts();
    return [
      ...this.groupValues().map((value) => ({ key: value.cle, label: value.libelle, count: counts[value.cle] ?? null })),
      { key: SANS_GROUPE, label: 'Sans groupe', count: counts[SANS_GROUPE] ?? null },
    ];
  });

  readonly selectedGroupLabels = computed(() => {
    const { groupes, sansGroupe } = this.state();
    const labels = groupes.map((key) => this.groupValues().find((value) => value.cle === key)?.libelle ?? key);
    return sansGroupe ? [...labels, 'Sans groupe'] : labels;
  });

  private readonly reload$ = new Subject<void>();

  constructor() {
    this.parametresApi.values('GSOC').pipe(catchError(() => of([]))).subscribe((values) => this.groupValues.set(values));
    this.parametresApi.values('PAYS').pipe(catchError(() => of([]))).subscribe((values) =>
      this.paysLabels.set(Object.fromEntries(values.map((value) => [value.cle, value.libelle]))),
    );

    this.searchControl.valueChanges
      .pipe(debounceTime(300), map((value) => value.trim()), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((search) => this.stateService.update({ search }));

    // Toute modification de l'état (filtres, tri, page) recharge la liste.
    effect(() => {
      this.state();
      untracked(() => this.reload$.next());
    });

    // Nombre de clients par groupe (selon le filtre actifs / tous).
    effect(() => {
      const includeInactive = this.state().includeInactive;
      const groups = this.groupValues();
      untracked(() => this.loadGroupCounts(includeInactive, groups));
    });

    // Client créé ou modifié depuis une fiche : la liste (conservée dans son onglet) est rafraîchie.
    this.clientsApi.changed$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.reload$.next());

    // Premier chargement : déclenché par l'effet ci-dessus à l'initialisation.
    this.reload$
      .pipe(
        switchMap(() => {
          this.loading.set(true);
          const s = this.state();
          return this.clientsApi.list({
            page: s.page,
            limit: s.pageSize,
            sortBy: s.sortBy,
            sortDirection: s.sortDirection,
            search: s.search || undefined,
            includeInactive: s.includeInactive,
            groupes: s.groupes,
            sansGroupe: s.sansGroupe || undefined,
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => { this.clients.set(result.items); this.meta.set(result.pagination); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
  }

  // --- Filtres ---------------------------------------------------------------

  toggleInactive(): void {
    this.stateService.update({ includeInactive: !this.state().includeInactive });
  }

  isGroupSelected(key: string): boolean {
    const { groupes, sansGroupe } = this.state();
    return key === SANS_GROUPE ? sansGroupe : groupes.includes(key);
  }

  toggleGroup(key: string): void {
    const { groupes, sansGroupe } = this.state();
    if (key === SANS_GROUPE) {
      this.stateService.update({ sansGroupe: !sansGroupe });
      return;
    }
    this.stateService.update({ groupes: groupes.includes(key) ? groupes.filter((g) => g !== key) : [...groupes, key] });
  }

  clearGroups(): void {
    this.stateService.update({ groupes: [], sansGroupe: false });
  }

  setView(view: 'list' | 'grid'): void {
    this.view.set(view);
  }

  // --- Tri et pagination -----------------------------------------------------

  sortBy(field: ClientSortField): void {
    const { sortBy, sortDirection } = this.state();
    this.stateService.update({
      sortBy: field,
      sortDirection: sortBy === field && sortDirection === 'ASC' ? 'DESC' : 'ASC',
    });
  }

  sortIcon(field: ClientSortField) {
    const { sortBy, sortDirection } = this.state();
    if (sortBy !== field) return ChevronsUpDown;
    return sortDirection === 'ASC' ? ChevronUp : ChevronDown;
  }

  ariaSort(field: ClientSortField): 'ascending' | 'descending' | 'none' {
    const { sortBy, sortDirection } = this.state();
    return sortBy !== field ? 'none' : sortDirection === 'ASC' ? 'ascending' : 'descending';
  }

  onPage(page: number): void {
    this.stateService.update({ page });
  }

  onPageSize(pageSize: number): void {
    this.stateService.update({ pageSize });
  }

  // --- Ouverture des fiches (dans un onglet) ---------------------------------

  openClient(client: ClientSummary): void {
    this.tabsService.openTab(`/clients/${client.id}`, client.raisonSociale || client.codeClient || `Client ${client.id}`);
  }

  createClient(): void {
    this.tabsService.openTab('/clients/nouveau', 'Nouveau client');
  }

  // --- Affichage -------------------------------------------------------------

  paysLabel(code: string | null): string {
    return code ? this.paysLabels()[code] ?? code : '';
  }

  /** Classe flag-icons (« fi fi-fr ») ; vide si le code n'est pas un code pays ISO à 2 lettres. */
  flagClass(code: string | null): string {
    return code && /^[A-Za-z]{2}$/.test(code) ? `fi fi-${code.toLowerCase()}` : '';
  }

  groupLabel(key: string | null): string {
    return key ? this.groupValues().find((value) => value.cle === key)?.libelle ?? key : '';
  }

  initials(client: ClientSummary): string {
    const name = client.raisonSociale || client.codeClient || '';
    return name.split(/[\s&.'-]+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || '?';
  }

  addressLines(client: ClientSummary): string[] {
    return [client.adresse1, client.adresse2, client.adresse3].filter((line): line is string => !!line);
  }

  cpVille(client: ClientSummary): string {
    return [client.codePostal, client.ville].filter(Boolean).join(' ');
  }

  private loadGroupCounts(includeInactive: boolean, groups: ParametreValue[]): void {
    const count = (query: { groupes?: string[]; sansGroupe?: boolean }) =>
      this.clientsApi.list({ ...query, includeInactive, limit: 1 }).pipe(
        map((page) => page.pagination?.totalItems ?? 0),
        catchError(() => of(0)),
      );
    const requests: Record<string, ReturnType<typeof count>> = { [SANS_GROUPE]: count({ sansGroupe: true }) };
    groups.forEach((group) => (requests[group.cle] = count({ groupes: [group.cle] })));
    forkJoin(requests).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((counts) => this.groupCounts.set(counts));
  }
}
