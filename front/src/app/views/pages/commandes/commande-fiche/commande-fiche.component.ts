import { Component, OnDestroy, computed, effect, inject, signal, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Building2, ClipboardList, Info, LucideAngularModule, Save } from 'lucide-angular';
import { catchError, of } from 'rxjs';
import Swal from 'sweetalert2';

import { ClientsApi } from '../../../../core/api/clients-api.service';
import { CommandesApi } from '../../../../core/api/commandes-api.service';
import { ParametresApi } from '../../../../core/api/parametres-api.service';
import { ApiError } from '../../../../core/models/api.model';
import { Contrat, ParametreValue } from '../../../../core/models/client.model';
import { CommandeDetail, CommandeInput } from '../../../../core/models/commande.model';
import { normalizeTabUrl } from '../../../../core/models/tab.model';
import { TabsService } from '../../../../core/services/tabs.service';
import { UiVisibleDirective } from '../../../../core/ui-access/ui-visible.directive';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageLoaderComponent } from '../../../../shared/components/page-loader/page-loader.component';
import { COMMANDES_UI_KEYS } from '../access/commandes-access.keys';
import { CommandeDocumentsComponent } from './commande-documents/commande-documents.component';
import { decimalText, parseDecimal } from './commande-fiche.utils';
import { CommandeTempsComponent } from './commande-temps/commande-temps.component';

/** Saisie de la commande : chaînes (vide = non renseigné), clés = champs de l'API. */
interface CommandeForm {
  clientId: string;
  clientContratId: string;
  typeCommande: string;
  numeroDevis: string;
  dateDevis: string;
  numeroCommandeClient: string;
  dateCommande: string;
  libelleCommande: string;
  nbJoursCommande: string;
  nbJoursPrevus: string;
  delai: string;
  montant: string;
  dateCloture: string;
}

type Field = keyof CommandeForm;

const EMPTY_FORM: CommandeForm = {
  clientId: '', clientContratId: '', typeCommande: '', numeroDevis: '', dateDevis: '', numeroCommandeClient: '',
  dateCommande: '', libelleCommande: '', nbJoursCommande: '', nbJoursPrevus: '', delai: '', montant: '', dateCloture: '',
};

const REQUIRED: Field[] = ['clientId', 'typeCommande', 'dateDevis', 'dateCommande', 'libelleCommande', 'nbJoursCommande', 'nbJoursPrevus'];

interface ClientOption {
  id: number;
  label: string;
}

/**
 * Fiche commande : consultation / modification (`/commandes/:id`) et
 * création (`/commandes/nouvelle`, client prérempli avec `?client=<id>`).
 * « Enregistrer » est actif dès qu'une modification est en cours. Temps passé
 * et documents apparaissent une fois la commande créée ; les documents sont
 * enregistrés immédiatement. La page est conservée lors des changements
 * d'onglet ; les modifications non enregistrées sont signalées sur l'onglet.
 */
@Component({
  selector: 'app-commande-fiche',
  imports: [
    LucideAngularModule, UiVisibleDirective, EmptyStateComponent, PageLoaderComponent,
    CommandeTempsComponent, CommandeDocumentsComponent,
  ],
  templateUrl: './commande-fiche.component.html',
  styleUrl: './commande-fiche.component.scss',
})
export class CommandeFicheComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly commandesApi = inject(CommandesApi);
  private readonly clientsApi = inject(ClientsApi);
  private readonly parametresApi = inject(ParametresApi);
  private readonly tabsService = inject(TabsService);

  readonly UiKeys = COMMANDES_UI_KEYS;
  readonly icons = { Building2, ClipboardList, Info, Save };

  /** URL de l'onglet de cette fiche (pastille « modifié »). */
  private readonly tabUrl = normalizeTabUrl(this.router.url);
  readonly commandeId = signal<number | null>(parseId(this.route.snapshot.paramMap.get('id')));

  readonly loading = signal(this.commandeId() !== null);
  readonly notFound = signal(false);
  readonly saving = signal(false);
  readonly commande = signal<CommandeDetail | null>(null);
  readonly form = signal<CommandeForm>({ ...EMPTY_FORM });
  private readonly initial = signal<CommandeForm>({ ...EMPTY_FORM });
  readonly errors = signal<Partial<Record<Field, string>>>({});

  private readonly activeClients = signal<ClientOption[]>([]);
  readonly contrats = signal<Contrat[]>([]);
  private readonly typesCommande = signal<ParametreValue[]>([]);

  readonly isNew = computed(() => this.commandeId() === null);
  readonly dirty = computed(() => JSON.stringify(this.form()) !== JSON.stringify(this.initial()));
  readonly saveDisabled = computed(() => this.saving() || (!this.isNew() && !this.dirty()));
  /** Client figé dès qu'un pointage est rattaché à la commande. */
  readonly clientLocked = computed(() => !!this.commande()?.hasPointages);

  // Bandeau
  readonly title = computed(() => {
    const commande = this.commande();
    return commande ? `Commande ${numero(commande)}` : 'Nouvelle commande';
  });
  readonly clientLabel = computed(() => this.clientOptions().find((client) => String(client.id) === this.form().clientId)?.label ?? '');
  readonly typeLabel = computed(() => this.typesCommande().find((type) => type.cle === this.form().typeCommande)?.libelle ?? '');
  readonly closed = computed(() => !!this.commande()?.dateCloture);
  readonly clotureLabel = computed(() => {
    const date = this.commande()?.dateCloture;
    return date ? `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : '';
  });

  /** Clients actifs, plus le client actuel de la commande s'il est devenu inactif. */
  readonly clientOptions = computed<ClientOption[]>(() => {
    const commande = this.commande();
    const clients = this.activeClients();
    if (commande && !clients.some((client) => client.id === commande.clientId)) {
      return [...clients, { id: commande.clientId, label: `${commande.client ?? `Client ${commande.clientId}`} (inactif)` }];
    }
    return clients;
  });
  readonly typeOptions = computed(() => {
    const current = this.form().typeCommande;
    const types = this.typesCommande();
    return current && !types.some((type) => type.cle === current) ? [...types, { cle: current, libelle: current }] : types;
  });

  readonly joursPrevus = computed(() => parseDecimal(this.form().nbJoursPrevus) ?? 0);
  readonly joursCommandes = computed(() => parseDecimal(this.form().nbJoursCommande) ?? 0);

  readonly tracabilite = computed(() => {
    const commande = this.commande();
    if (!commande) {
      return '';
    }
    const part = (label: string, at: string, by: string | null) => `${label} le ${dateHeure(at)}${by ? ` par ${by}` : ''}`;
    return `${part('Créée', commande.createdAt, commande.createdBy)} · ${part('Modifiée', commande.updatedAt, commande.updatedBy)}`;
  });

  constructor() {
    this.parametresApi.values('TYPC').pipe(catchError(() => of([]))).subscribe((values) => this.typesCommande.set(values));
    this.clientsApi
      .list({ limit: 1000, sortBy: 'raisonSociale', sortDirection: 'ASC' })
      .pipe(catchError(() => of({ items: [], pagination: null })))
      .subscribe((page) =>
        this.activeClients.set(page.items.map((client) => ({ id: client.id, label: client.raisonSociale || client.codeClient || `Client ${client.id}` }))),
      );

    // Pastille orange sur l'onglet tant que la fiche a des modifications non enregistrées.
    effect(() => {
      const dirty = this.dirty();
      untracked(() => this.tabsService.setDirty(this.tabUrl, dirty));
    });

    // Contrats du client choisi.
    effect(() => {
      const clientId = Number(this.form().clientId);
      untracked(() => {
        if (!clientId) {
          this.contrats.set([]);
          return;
        }
        this.clientsApi.contrats(clientId).pipe(catchError(() => of([] as Contrat[]))).subscribe((contrats) => this.contrats.set(contrats));
      });
    });

    const id = this.commandeId();
    if (id !== null) {
      this.load(id);
    } else {
      // Création depuis une fiche client (client prérempli) ou depuis le
      // tableau de bord, « Renouveler » un contrat (client et contrat).
      const params = this.route.snapshot.queryParamMap;
      const client = parseId(params.get('client'));
      if (client !== null) {
        const contrat = parseId(params.get('contrat'));
        this.form.update((form) => ({ ...form, clientId: String(client), clientContratId: contrat === null ? '' : String(contrat) }));
        this.initial.set(this.form());
      }
    }
  }

  ngOnDestroy(): void {
    this.tabsService.setDirty(this.tabUrl, false);
  }

  // --- Saisie --------------------------------------------------------------

  set(field: Field, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
    // Changer de client vide le contrat (les contrats dépendent du client).
    const reset = field === 'clientId' ? { clientContratId: '' } : {};
    this.form.update((form) => ({ ...form, ...reset, [field]: value }));
    this.errors.update((errors) => ({ ...errors, [field]: undefined }));
  }

  openClient(): void {
    const id = Number(this.form().clientId);
    if (id) {
      this.tabsService.openTab(`/clients/${id}`, this.clientLabel().replace(/ \(inactif\)$/, '') || `Client ${id}`);
    }
  }

  save(): void {
    if (this.saveDisabled()) {
      return;
    }
    const form = this.form();
    const errors: Partial<Record<Field, string>> = {};
    REQUIRED.filter((field) => !form[field].trim()).forEach((field) => (errors[field] = 'Champ obligatoire.'));
    (['nbJoursCommande', 'nbJoursPrevus', 'montant'] as const).forEach((field) => {
      if (form[field].trim() && parseDecimal(form[field]) === null) {
        errors[field] = 'Nombre invalide.';
      }
    });
    if (Object.keys(errors).length > 0) {
      this.errors.set(errors);
      return;
    }

    const id = this.commandeId();
    const input = toInput(form);
    this.saving.set(true);
    (id === null ? this.commandesApi.create(input) : this.commandesApi.update(id, input)).subscribe({
      next: (commande) => {
        this.saving.set(false);
        this.apply(commande);
        if (id === null) {
          // La fiche devient /commandes/:id (même onglet, renommé).
          this.commandeId.set(commande.id);
          void this.showSuccess('Création effectuée');
          this.tabsService.replaceTabUrl(this.tabUrl, `/commandes/${commande.id}`, `Commande ${numero(commande)}`);
          return;
        }
        this.tabsService.setTabTitle(this.tabUrl, `Commande ${numero(commande)}`);
        void this.showSuccess('Modification effectuée');
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        const details = (error.error as { error?: ApiError } | null)?.error?.details ?? [];
        // Premier message par champ.
        const byField: Partial<Record<Field, string>> = {};
        details.forEach((detail) => (byField[detail.field as Field] ??= detail.message));
        this.errors.set(byField);
      },
    });
  }

  // --- Chargement ----------------------------------------------------------

  private load(id: number): void {
    this.commandesApi.get(id).subscribe({
      next: (commande) => {
        this.apply(commande);
        this.loading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  private apply(commande: CommandeDetail): void {
    const form: CommandeForm = {
      clientId: String(commande.clientId),
      clientContratId: commande.clientContratId === null ? '' : String(commande.clientContratId),
      typeCommande: commande.typeCommande,
      numeroDevis: commande.numeroDevis ?? '',
      dateDevis: commande.dateDevis,
      numeroCommandeClient: commande.numeroCommandeClient ?? '',
      dateCommande: commande.dateCommande,
      libelleCommande: commande.libelleCommande,
      nbJoursCommande: decimalText(commande.nbJoursCommande),
      nbJoursPrevus: decimalText(commande.nbJoursPrevus),
      delai: commande.delai ?? '',
      montant: decimalText(commande.montant),
      dateCloture: commande.dateCloture ?? '',
    };
    this.commande.set(commande);
    this.form.set(form);
    this.initial.set(form);
    this.errors.set({});
  }

  /** Alerte de réussite sans bouton, fermée automatiquement. */
  private showSuccess(title: string): Promise<unknown> {
    return Swal.fire({
      icon: 'success',
      title,
      showConfirmButton: false,
      timer: 1400,
      width: 400,
      customClass: { title: 'fiche-success-title' },
    });
  }
}

function toInput(form: CommandeForm): CommandeInput {
  const orNull = (value: string) => value.trim() || null;
  return {
    clientId: Number(form.clientId),
    clientContratId: form.clientContratId ? Number(form.clientContratId) : null,
    typeCommande: form.typeCommande,
    numeroDevis: orNull(form.numeroDevis),
    dateDevis: form.dateDevis,
    numeroCommandeClient: orNull(form.numeroCommandeClient),
    dateCommande: form.dateCommande,
    libelleCommande: form.libelleCommande.trim(),
    nbJoursCommande: parseDecimal(form.nbJoursCommande) ?? 0,
    nbJoursPrevus: parseDecimal(form.nbJoursPrevus) ?? 0,
    delai: orNull(form.delai),
    montant: parseDecimal(form.montant),
    dateCloture: orNull(form.dateCloture),
  };
}

/** N° affiché : n° de commande, à défaut n° de devis. */
function numero(commande: CommandeDetail): string {
  return commande.numeroCommandeClient || commande.numeroDevis || `n° ${commande.id}`;
}

function parseId(value: string | null): number | null {
  const id = Number(value);
  return value !== null && Number.isInteger(id) && id > 0 ? id : null;
}

function dateHeure(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} à ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

