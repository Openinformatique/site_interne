import { Component, DestroyRef, OnDestroy, computed, effect, inject, signal, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { CalendarDays, Eye, Info, LucideAngularModule, Mail, Phone, Plus, Save, X } from 'lucide-angular';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { ClientsApi } from '../../../../core/api/clients-api.service';
import { ParametresApi } from '../../../../core/api/parametres-api.service';
import { ApiError } from '../../../../core/models/api.model';
import {
  ClientCommande,
  ClientDetail,
  ClientInput,
  Contact,
  Contrat,
  ParametreValue,
} from '../../../../core/models/client.model';
import { normalizeTabUrl } from '../../../../core/models/tab.model';
import { TabsService } from '../../../../core/services/tabs.service';
import { UiVisibleDirective } from '../../../../core/ui-access/ui-visible.directive';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageLoaderComponent } from '../../../../shared/components/page-loader/page-loader.component';
import { CLIENTS_UI_KEYS } from '../access/clients-access.keys';
import { formatHeures, formatJours, frDate, initiales, todayIso } from './client-fiche.utils';
import { ContactModalComponent } from './contact-modal/contact-modal.component';
import { ContratModalComponent } from './contrat-modal/contrat-modal.component';

/** Saisie du client : chaînes (vide = non renseigné) et statut. */
interface ClientForm {
  codeClient: string;
  raisonSociale: string;
  actif: boolean;
  adresse1: string;
  adresse2: string;
  adresse3: string;
  codePostal: string;
  ville: string;
  codePays: string;
  groupe: string;
  numeroTva: string;
  modeReglement: string;
}

type TextField = Exclude<keyof ClientForm, 'actif'>;

const EMPTY_FORM: ClientForm = {
  codeClient: '', raisonSociale: '', actif: true, adresse1: '', adresse2: '', adresse3: '',
  codePostal: '', ville: '', codePays: 'FR', groupe: '', numeroTva: '', modeReglement: '',
};

const REQUIRED: TextField[] = ['codeClient', 'raisonSociale', 'codePostal', 'ville', 'codePays'];

const MODAL_OPTIONS: NgbModalOptions = { backdropClass: 'fiche-modal-backdrop', animation: true };

/**
 * Fiche client : consultation / modification (`/clients/:id`) et création
 * (`/clients/nouveau`). Toujours modifiable ; « Enregistrer » est actif dès
 * qu'une modification est en cours. Contrats et contacts sont enregistrés
 * immédiatement depuis leur modale ; les commandes s'ouvrent dans un onglet.
 * La page est conservée lors des changements d'onglet (TabRouteReuseStrategy) ;
 * les modifications non enregistrées sont signalées sur l'onglet.
 */
@Component({
  selector: 'app-client-fiche',
  imports: [LucideAngularModule, UiVisibleDirective, EmptyStateComponent, PageLoaderComponent],
  templateUrl: './client-fiche.component.html',
  styleUrl: './client-fiche.component.scss',
})
export class ClientFicheComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clientsApi = inject(ClientsApi);
  private readonly parametresApi = inject(ParametresApi);
  private readonly tabsService = inject(TabsService);
  private readonly modal = inject(NgbModal);
  private readonly destroyRef = inject(DestroyRef);

  readonly UiKeys = CLIENTS_UI_KEYS;
  readonly icons = { CalendarDays, Eye, Info, Mail, Phone, Plus, Save, X };
  readonly frDate = frDate;
  readonly formatHeures = formatHeures;
  readonly formatJours = formatJours;
  private readonly today = todayIso();

  /** URL de l'onglet de cette fiche (pastille « modifié »). */
  private readonly tabUrl = normalizeTabUrl(this.router.url);
  readonly clientId = signal<number | null>(this.parseId(this.route.snapshot.paramMap.get('id')));

  readonly loading = signal(this.clientId() !== null);
  readonly notFound = signal(false);
  readonly saving = signal(false);
  readonly client = signal<ClientDetail | null>(null);
  readonly form = signal<ClientForm>({ ...EMPTY_FORM });
  private readonly initial = signal<ClientForm>({ ...EMPTY_FORM });
  readonly errors = signal<Partial<Record<keyof ClientForm, string>>>({});

  readonly contrats = signal<Contrat[]>([]);
  readonly contacts = signal<Contact[]>([]);
  readonly commandes = signal<ClientCommande[]>([]);
  readonly showInactiveContacts = signal(false);
  readonly showClosed = signal(false);
  readonly periodOpen = signal(false);
  readonly du = signal('');
  readonly au = signal('');

  private readonly pays = signal<ParametreValue[]>([]);
  readonly groupes = signal<ParametreValue[]>([]);
  readonly reglements = signal<ParametreValue[]>([]);
  private readonly postes = signal<string[]>([]);
  private readonly typesCommande = signal<Record<string, string>>({});

  readonly isNew = computed(() => this.clientId() === null);
  readonly dirty = computed(() => JSON.stringify(this.form()) !== JSON.stringify(this.initial()));
  readonly saveDisabled = computed(() => this.saving() || (!this.isNew() && !this.dirty()));

  // Bandeau
  readonly title = computed(() => this.form().raisonSociale || 'Nouveau client');
  readonly initials = computed(() => initiales(this.form().raisonSociale));
  readonly paysOptions = computed(() => this.withCurrent(this.pays(), this.form().codePays));
  readonly groupeOptions = computed(() => this.withCurrent(this.groupes(), this.form().groupe));
  readonly reglementOptions = computed(() => this.withCurrent(this.reglements(), this.form().modeReglement));
  readonly paysLabel = computed(() => {
    const code = this.form().codePays;
    return this.pays().find((value) => value.cle === code)?.libelle ?? code;
  });
  readonly flagClass = computed(() => {
    const code = this.form().codePays;
    return /^[A-Za-z]{2}$/.test(code) ? `fi fi-${code.toLowerCase()}` : '';
  });
  readonly groupeLabel = computed(() => {
    const key = this.form().groupe;
    return this.groupes().find((value) => value.cle === key)?.libelle ?? key;
  });

  // Contacts
  readonly visibleContacts = computed(() =>
    this.contacts().filter((contact) => this.showInactiveContacts() || contact.actif),
  );
  readonly activeContactCount = computed(() => this.contacts().filter((contact) => contact.actif).length);
  readonly inactiveContactCount = computed(() => this.contacts().filter((contact) => !contact.actif).length);

  readonly tracabilite = computed(() => {
    const client = this.client();
    if (!client) {
      return '';
    }
    const part = (label: string, at: string, by: string | null) => `${label} le ${this.dateHeure(at)}${by ? ` par ${by}` : ''}`;
    return `${part('Créé', client.createdAt, client.createdBy)} · ${part('Modifié', client.updatedAt, client.updatedBy)}`;
  });

  private readonly reloadCommandes$ = new Subject<void>();

  constructor() {
    this.loadParametres();

    // Pastille orange sur l'onglet tant que la fiche a des modifications non enregistrées.
    effect(() => {
      const dirty = this.dirty();
      untracked(() => this.tabsService.setDirty(this.tabUrl, dirty));
    });

    this.reloadCommandes$
      .pipe(
        switchMap(() => {
          const id = this.clientId();
          if (id === null) {
            return of([]);
          }
          return this.clientsApi
            .commandes(id, { includeClosed: this.showClosed(), du: this.du() || undefined, au: this.au() || undefined })
            .pipe(catchError(() => of([])));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((commandes) => this.commandes.set(commandes));

    // Filtres des commandes : rechargement à chaque changement.
    effect(() => {
      this.showClosed();
      this.du();
      this.au();
      untracked(() => this.reloadCommandes$.next());
    });

    const id = this.clientId();
    if (id !== null) {
      this.loadClient(id);
    }
  }

  ngOnDestroy(): void {
    this.tabsService.setDirty(this.tabUrl, false);
  }

  // --- Saisie --------------------------------------------------------------

  set(field: TextField, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.form.update((form) => ({ ...form, [field]: value }));
    this.errors.update((errors) => ({ ...errors, [field]: undefined }));
  }

  /** Code client forcé en majuscules (position du curseur conservée). */
  setCode(event: Event): void {
    const input = event.target as HTMLInputElement;
    const upper = input.value.toUpperCase();
    if (input.value !== upper) {
      const caret = input.selectionStart;
      input.value = upper;
      input.setSelectionRange(caret, caret);
    }
    this.set('codeClient', event);
  }

  toggleActif(): void {
    this.form.update((form) => ({ ...form, actif: !form.actif }));
  }

  save(): void {
    if (this.saveDisabled()) {
      return;
    }
    const form = this.form();
    const missing = REQUIRED.filter((field) => !form[field].trim());
    if (missing.length > 0) {
      this.errors.set(Object.fromEntries(missing.map((field) => [field, 'Champ obligatoire.'])));
      return;
    }

    const id = this.clientId();
    const input = this.toInput(form);
    this.saving.set(true);
    (id === null ? this.clientsApi.create(input) : this.clientsApi.update(id, input)).subscribe({
      next: (client) => {
        this.saving.set(false);
        if (id === null) {
          // La fiche devient /clients/:id (même onglet, renommé).
          this.initial.set(form);
          void this.showSuccess('Création effectuée');
          this.tabsService.replaceTabUrl(this.tabUrl, `/clients/${client.id}`, this.tabTitle(client));
          return;
        }
        this.applyClient(client);
        this.tabsService.setTabTitle(this.tabUrl, this.tabTitle(client));
        void this.showSuccess('Modifications enregistrées');
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        const details = (error.error as { error?: ApiError } | null)?.error?.details ?? [];
        this.errors.set(Object.fromEntries(details.map((detail) => [detail.field, detail.message])));
      },
    });
  }

  // --- Contrats ------------------------------------------------------------

  contratEchu(contrat: Contrat): boolean {
    return !!contrat.dateEcheance && contrat.dateEcheance < this.today;
  }

  openContrat(contrat: Contrat | null, event?: Event): void {
    event?.stopPropagation();
    const id = this.clientId();
    if (id === null) {
      return;
    }
    const ref = this.modal.open(ContratModalComponent, { ...MODAL_OPTIONS, modalDialogClass: 'fiche-modal fiche-modal-contrat' });
    (ref.componentInstance as ContratModalComponent).init(id, contrat);
    ref.result.then(
      () => {
        this.reloadContrats(id);
        this.reloadCommandes$.next();
        this.showToast('Contrat enregistré.');
      },
      () => undefined,
    );
  }

  // --- Contacts ------------------------------------------------------------

  civiliteLabel(civilite: number): string {
    return civilite === 1 ? 'M.' : civilite === 2 ? 'Mme' : '';
  }

  contactName(contact: Contact): string {
    return [this.civiliteLabel(contact.civilite), contact.nom, contact.prenom].filter(Boolean).join(' ');
  }

  contactInitials(contact: Contact): string {
    return `${(contact.prenom ?? ' ')[0]}${contact.nom[0] ?? ''}`.trim().toUpperCase();
  }

  telHref(telephone: string): string {
    return `tel:${telephone.replace(/\s/g, '')}`;
  }

  openContact(contact: Contact | null, event?: Event): void {
    event?.stopPropagation();
    const id = this.clientId();
    if (id === null) {
      return;
    }
    const ref = this.modal.open(ContactModalComponent, { ...MODAL_OPTIONS, modalDialogClass: 'fiche-modal fiche-modal-contact' });
    (ref.componentInstance as ContactModalComponent).init(id, contact, this.postes());
    ref.result.then(
      () => {
        this.clientsApi.contacts(id).subscribe((contacts) => this.contacts.set(contacts));
        this.showToast('Contact enregistré.');
      },
      () => undefined,
    );
  }

  // --- Commandes -----------------------------------------------------------

  typeLabel(key: string | null): string {
    return key ? this.typesCommande()[key] ?? key : '—';
  }

  commandeEnRetard(commande: ClientCommande): boolean {
    return !commande.dateCloture && !!commande.delai && commande.delai < this.today;
  }

  commandeNumero(commande: ClientCommande): string {
    return commande.numeroCommande || commande.numeroDevis || `n° ${commande.id}`;
  }

  openCommande(commande: ClientCommande, event?: Event): void {
    event?.stopPropagation();
    this.tabsService.openTab(`/commandes/${commande.id}`, `Commande ${this.commandeNumero(commande)}`);
  }

  newCommande(): void {
    this.tabsService.openTab(`/commandes/nouvelle?client=${this.clientId()}`, 'Nouvelle commande');
  }

  setPeriod(field: 'du' | 'au', event: Event): void {
    this[field].set((event.target as HTMLInputElement).value);
  }

  closePeriod(): void {
    this.periodOpen.set(false);
    this.du.set('');
    this.au.set('');
  }

  // --- Chargement ----------------------------------------------------------

  private loadClient(id: number): void {
    forkJoin({
      client: this.clientsApi.get(id),
      contrats: this.clientsApi.contrats(id),
      contacts: this.clientsApi.contacts(id),
    }).subscribe({
      next: ({ client, contrats, contacts }) => {
        this.applyClient(client);
        this.contrats.set(contrats);
        this.contacts.set(contacts);
        this.loading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  private reloadContrats(id: number): void {
    this.clientsApi.contrats(id).subscribe((contrats) => this.contrats.set(contrats));
  }

  private loadParametres(): void {
    const values = (table: string) => this.parametresApi.values(table).pipe(catchError(() => of([] as ParametreValue[])));
    values('PAYS').subscribe((list) => this.pays.set(list));
    values('GSOC').subscribe((list) => this.groupes.set(list));
    values('REGL').subscribe((list) => this.reglements.set(list));
    values('FONC').subscribe((list) => this.postes.set(list.map((value) => value.libelle)));
    values('TYPC').subscribe((list) => this.typesCommande.set(Object.fromEntries(list.map((value) => [value.cle, value.libelle]))));
  }

  private applyClient(client: ClientDetail): void {
    const form: ClientForm = {
      codeClient: client.codeClient ?? '',
      raisonSociale: client.raisonSociale ?? '',
      actif: client.actif,
      adresse1: client.adresse1 ?? '',
      adresse2: client.adresse2 ?? '',
      adresse3: client.adresse3 ?? '',
      codePostal: client.codePostal ?? '',
      ville: client.ville ?? '',
      codePays: client.codePays ?? '',
      groupe: client.groupe ?? '',
      numeroTva: client.numeroTva ?? '',
      modeReglement: client.modeReglement ?? '',
    };
    this.client.set(client);
    this.form.set(form);
    this.initial.set(form);
    this.errors.set({});
  }

  private toInput(form: ClientForm): ClientInput {
    const orNull = (value: string) => value.trim() || null;
    return {
      codeClient: form.codeClient.trim().toUpperCase(),
      raisonSociale: form.raisonSociale.trim(),
      actif: form.actif,
      adresse1: orNull(form.adresse1),
      adresse2: orNull(form.adresse2),
      adresse3: orNull(form.adresse3),
      codePostal: form.codePostal.trim(),
      ville: form.ville.trim(),
      codePays: form.codePays,
      groupe: orNull(form.groupe),
      numeroTva: orNull(form.numeroTva),
      modeReglement: orNull(form.modeReglement),
    };
  }

  /** Valeur actuelle conservée dans la liste même si elle n'est plus paramétrée (affichée par son code). */
  private withCurrent(values: ParametreValue[], current: string): ParametreValue[] {
    return current && !values.some((value) => value.cle === current) ? [...values, { cle: current, libelle: current }] : values;
  }

  private tabTitle(client: ClientDetail): string {
    return client.raisonSociale || client.codeClient || `Client ${client.id}`;
  }

  private parseId(value: string | null): number | null {
    const id = Number(value);
    return value !== null && Number.isInteger(id) ? id : null;
  }

  private dateHeure(iso: string): string {
    const date = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} à ${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

  /** Petit message en bas à droite (enregistrement d'un contrat / contact). */
  private showToast(title: string): void {
    void Swal.fire({
      toast: true,
      position: 'bottom-end',
      title,
      showConfirmButton: false,
      timer: 2600,
      customClass: { popup: 'fiche-toast' },
    });
  }
}
