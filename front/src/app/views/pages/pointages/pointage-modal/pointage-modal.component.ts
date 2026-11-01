import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { LucideAngularModule, Trash2, X } from 'lucide-angular';
import Swal from 'sweetalert2';

import { PointagesApi } from '../../../../core/api/pointages-api.service';
import { ApiError } from '../../../../core/models/api.model';
import {
  FACTURABLE,
  Pointage,
  PointageCommandeOption,
  PointageContactOption,
  PointageInput,
  PointagesReference,
} from '../../../../core/models/pointage.model';
import {
  couleurType,
  dureeHeures,
  formatHeures,
  hm,
  isoDate,
  joinTags,
  JOURS_LONGS,
  NATURE_COMMANDE,
  normalize,
  splitTags,
  toInstant,
  TYPES_SANS_CLIENT,
} from '../pointages.utils';

/** Résultat de la modale : pointage enregistré, ou supprimé. */
export type PointageModalResult = { saved: Pointage } | { deleted: number };

type Facturation = 'attente' | 'oui' | 'non';

interface Draft {
  date: string;
  debut: string;
  fin: string;
  typeAction: string;
  tags: string[];
  description: string;
  clientId: string;
  contactId: string;
  commandeId: string;
  facturation: Facturation;
  tempsFacturable: string;
}

const FACTURATIONS: { value: Facturation; label: string; color: string }[] = [
  { value: 'attente', label: 'En attente', color: '#f5a623' },
  { value: 'oui', label: 'Facturable', color: '#20bd7b' },
  { value: 'non', label: 'Non facturable', color: '#7987a1' },
];

function facturationOf(code: number): Facturation {
  return code === FACTURABLE.oui ? 'oui' : code === FACTURABLE.non ? 'non' : 'attente';
}

/** « 1,5 » → 1.5 ; null si vide ou invalide. */
function parseHeures(text: string): number | null {
  const value = Number(text.replace(',', '.').trim());
  return text.trim() === '' || Number.isNaN(value) ? null : value;
}

/**
 * Modale « Nouveau pointage » / « Modifier le pointage » (disposition de
 * l'ancien écran : libellés à gauche). Règles de saisie contrôlées avant
 * l'envoi, puis par le back (erreurs affichées sous les champs).
 */
@Component({
  selector: 'app-pointage-modal',
  imports: [LucideAngularModule],
  templateUrl: './pointage-modal.component.html',
  styleUrl: './pointage-modal.component.scss',
})
export class PointageModalComponent {
  private readonly activeModal = inject(NgbActiveModal);
  private readonly api = inject(PointagesApi);

  readonly X = X;
  readonly Trash2 = Trash2;
  readonly facturations = FACTURATIONS;

  readonly reference = signal<PointagesReference>({ types: [], tags: [], personnes: [], clients: [] });
  readonly pointage = signal<Pointage | null>(null);
  private utilisateurId = '';
  readonly draft = signal<Draft>({
    date: '', debut: '', fin: '', typeAction: '', tags: [], description: '',
    clientId: '', contactId: '', commandeId: '', facturation: 'oui', tempsFacturable: '',
  });
  /** Facturable d'origine (codes repris 3 / 4 conservés tant que « En attente » reste choisi). */
  private facturableOrigine: number = FACTURABLE.oui;
  readonly contacts = signal<PointageContactOption[]>([]);
  readonly commandes = signal<PointageCommandeOption[]>([]);
  readonly errors = signal<Record<string, string>>({});
  readonly saving = signal(false);

  readonly tagInput = signal('');
  readonly tagFocus = signal(false);

  readonly isNew = computed(() => this.pointage() === null);
  readonly title = computed(() => (this.isNew() ? 'Nouveau pointage' : 'Modifier le pointage'));

  readonly type = computed(() => this.reference().types.find((type) => type.cle === this.draft().typeAction) ?? null);
  readonly typeColor = computed(() => couleurType(this.type()?.couleur));
  readonly nature = computed(() => NATURE_COMMANDE[this.draft().typeAction] ?? null);
  readonly clientRequired = computed(() => !!this.draft().typeAction && !TYPES_SANS_CLIENT.includes(this.draft().typeAction));
  readonly contactRequired = computed(() => this.nature() === 'contrat');
  readonly noClient = computed(() => !this.draft().clientId);
  readonly nonFacturable = computed(() => this.draft().facturation === 'non');

  readonly duree = computed(() => {
    const { date, debut, fin } = this.draft();
    const start = toInstant(date, debut);
    const end = toInstant(date, fin, true);
    return start && end ? Math.max(0, dureeHeures(start, end)) : 0;
  });
  readonly dureeLabel = computed(() => `${formatHeures(this.duree())} h`);

  /** Clients actifs, plus le client du pointage s'il ne l'est plus. */
  readonly clientOptions = computed(() => {
    const clients = this.reference().clients.map((client) => ({ id: client.id, label: client.nom || client.code || `Client ${client.id}` }));
    const pointage = this.pointage();
    if (pointage?.clientId && !clients.some((client) => client.id === pointage.clientId)) {
      clients.unshift({ id: pointage.clientId, label: pointage.clientNom || pointage.clientCode || `Client ${pointage.clientId}` });
    }
    return clients;
  });

  /** Commandes du client de la nature imposée par le type ; clôturées masquées (sauf celle du pointage). */
  readonly commandeOptions = computed(() => {
    const nature = this.nature();
    const current = this.draft().commandeId;
    return this.commandes()
      .filter((commande) => !commande.cloturee || String(commande.id) === current)
      .filter((commande) => !nature || commande.contrat === (nature === 'contrat'))
      .map((commande) => ({
        id: commande.id,
        label: `${commande.numero ?? commande.id} — ${commande.libelle ?? ''}${commande.contrat ? ' (contrat)' : ''}`,
      }));
  });

  readonly contactOptions = computed(() => {
    const current = this.draft().contactId;
    return this.contacts()
      .filter((contact) => contact.actif || String(contact.id) === current)
      .map((contact) => ({ id: contact.id, label: contact.nom ?? `Contact ${contact.id}` }));
  });

  readonly commandeHint = computed(() =>
    this.nature() === 'commande'
      ? 'Développement sur devis : commandes de type commande uniquement.'
      : this.nature() === 'contrat'
        ? 'Assistance : commandes de type contrat uniquement.'
        : '',
  );

  // --- Tags -----------------------------------------------------------------

  private readonly catalogue = computed(() => this.reference().tags);
  readonly tagSuggestions = computed(() => {
    const typed = normalize(this.tagInput());
    const tags = this.draft().tags.map(normalize);
    return this.catalogue()
      .filter((tag) => !tags.includes(normalize(tag)) && (!typed || normalize(tag).includes(typed)))
      .slice(0, 6);
  });
  readonly tagFreeHint = computed(() => !!this.tagInput().trim() && !this.inCatalogue(this.tagInput()));
  readonly tagMenuOpen = computed(() => this.tagFocus() && this.tagSuggestions().length + (this.tagInput().trim() ? 1 : 0) > 0);

  isParamTag(tag: string): boolean {
    return !!this.inCatalogue(tag);
  }

  private inCatalogue(tag: string): string | undefined {
    return this.catalogue().find((candidate) => normalize(candidate) === normalize(tag));
  }

  /** Ajoute un tag (libellé du paramétrage si reconnu, sinon tag libre), sans doublon. */
  addTag(raw: string): void {
    const value = raw.replace(/[[\]]/g, '').trim();
    this.tagInput.set('');
    if (!value) {
      return;
    }
    const label = this.inCatalogue(value) ?? value;
    if (!this.draft().tags.some((tag) => normalize(tag) === normalize(label))) {
      this.patch({ tags: [...this.draft().tags, label] });
    }
  }

  removeTag(index: number): void {
    this.patch({ tags: this.draft().tags.filter((_, position) => position !== index) });
  }

  onTagKey(event: KeyboardEvent): void {
    const typed = this.tagInput();
    if (event.key === 'Enter' || (event.key === 'Tab' && typed.trim())) {
      if (event.key === 'Enter') {
        event.preventDefault();
      }
      this.addTag(typed);
    } else if (event.key === 'Backspace' && !typed && this.draft().tags.length) {
      this.patch({ tags: this.draft().tags.slice(0, -1) });
    }
  }

  onTagBlur(): void {
    this.addTag(this.tagInput());
    this.tagFocus.set(false);
  }

  /** mousedown (avant le blur du champ) : la suggestion est ajoutée telle quelle. */
  pickTag(event: MouseEvent, tag: string): void {
    event.preventDefault();
    this.addTag(tag);
  }

  // --- Initialisation et saisie ---------------------------------------------

  /** À appeler juste après l'ouverture : pointage existant, ou plage sélectionnée (création). */
  init(reference: PointagesReference, utilisateurId: string, pointage: Pointage | null, debut?: Date, fin?: Date): void {
    this.reference.set(reference);
    this.utilisateurId = pointage?.utilisateurId ?? utilisateurId;
    this.pointage.set(pointage);
    if (pointage) {
      const start = new Date(pointage.debut);
      const end = new Date(pointage.fin);
      const { tags, texte } = splitTags(pointage.description);
      this.facturableOrigine = pointage.facturable;
      this.draft.set({
        date: isoDate(start),
        debut: hm(start),
        fin: hm(end),
        typeAction: pointage.typeAction,
        tags,
        description: texte,
        clientId: pointage.clientId ? String(pointage.clientId) : '',
        contactId: pointage.contactId ? String(pointage.contactId) : '',
        commandeId: pointage.commandeId ? String(pointage.commandeId) : '',
        facturation: facturationOf(pointage.facturable),
        tempsFacturable: formatHeures(pointage.tempsFacturable ?? dureeHeures(start, end)),
      });
      if (pointage.clientId) {
        this.loadClientOptions(pointage.clientId);
      }
    } else if (debut && fin) {
      this.draft.update((draft) => ({
        ...draft,
        date: isoDate(debut),
        debut: hm(debut),
        fin: hm(fin),
        tempsFacturable: formatHeures(dureeHeures(debut, fin)),
      }));
    }
  }

  /** Toute saisie efface l'erreur du champ modifié. */
  private patch(changes: Partial<Draft>): void {
    this.draft.update((draft) => ({ ...draft, ...changes }));
    this.errors.update((errors) => {
      const next = { ...errors };
      for (const key of Object.keys(changes)) {
        delete next[key];
        if (key === 'date' || key === 'debut' || key === 'fin') {
          delete next['horaire'];
        }
      }
      return next;
    });
  }

  set(field: 'date' | 'debut' | 'fin' | 'description' | 'contactId' | 'commandeId' | 'tempsFacturable', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.patch({ [field]: value });
    // La durée contrat suit la durée du créneau.
    if (field === 'date' || field === 'debut' || field === 'fin') {
      if (this.duree() > 0) {
        this.patch({ tempsFacturable: formatHeures(this.duree()) });
      }
    }
  }

  setType(event: Event): void {
    const typeAction = (event.target as HTMLSelectElement).value;
    const changes: Partial<Draft> = { typeAction };
    if (TYPES_SANS_CLIENT.includes(typeAction)) {
      changes.facturation = 'non';
    }
    // Changer de type vide la commande si elle n'est plus de la bonne nature.
    const nature = NATURE_COMMANDE[typeAction];
    const commande = this.commandes().find((candidate) => String(candidate.id) === this.draft().commandeId);
    if (commande && nature && commande.contrat !== (nature === 'contrat')) {
      changes.commandeId = '';
    }
    this.patch(changes);
  }

  setClient(event: Event): void {
    const clientId = (event.target as HTMLSelectElement).value;
    this.patch({ clientId, contactId: '', commandeId: '' });
    this.contacts.set([]);
    this.commandes.set([]);
    if (clientId) {
      this.loadClientOptions(Number(clientId));
    }
  }

  setFacturation(facturation: Facturation): void {
    this.patch({ facturation });
    if (facturation === 'non') {
      this.patch({ tempsFacturable: formatHeures(this.duree()) });
    }
  }

  private loadClientOptions(clientId: number): void {
    this.api.clientOptions(clientId).subscribe((options) => {
      // Réponse d'un client qui n'est plus sélectionné : ignorée.
      if (this.draft().clientId === String(clientId)) {
        this.contacts.set(options.contacts);
        this.commandes.set(options.commandes);
      }
    });
  }

  // --- Enregistrement / suppression -----------------------------------------

  close(): void {
    this.activeModal.dismiss();
  }

  save(): void {
    const draft = this.draft();
    this.addTag(this.tagInput());
    const errors: Record<string, string> = {};
    const debut = toInstant(draft.date, draft.debut);
    const fin = toInstant(draft.date, draft.fin, true);
    if (!debut || !fin) {
      errors['horaire'] = 'Date et heures obligatoires.';
    } else if (fin <= debut) {
      errors['horaire'] = "L'heure de fin doit suivre l'heure de début.";
    }
    if (!draft.typeAction) errors['typeAction'] = 'Champ obligatoire.';
    if (this.clientRequired() && !draft.clientId) errors['clientId'] = 'Client obligatoire pour ce type de pointage.';
    if (this.nature() === 'contrat' && !draft.contactId) errors['contactId'] = 'Contact obligatoire pour une assistance.';
    if (this.nature() && !draft.commandeId) {
      errors['commandeId'] = this.nature() === 'commande' ? 'Choisissez une commande de type commande.' : 'Choisissez une commande de type contrat.';
    }
    const tempsFacturable = this.nonFacturable() ? this.duree() : parseHeures(draft.tempsFacturable);
    if (!this.nonFacturable() && draft.tempsFacturable.trim() && (tempsFacturable === null || tempsFacturable < 0 || tempsFacturable > 24)) {
      errors['tempsFacturable'] = 'Durée invalide (0 à 24 h).';
    }
    if (Object.keys(errors).length > 0 || !debut || !fin) {
      this.errors.set(errors);
      return;
    }

    const input: PointageInput = {
      utilisateurId: this.utilisateurId,
      debut: debut.toISOString(),
      fin: fin.toISOString(),
      typeAction: draft.typeAction,
      clientId: draft.clientId ? Number(draft.clientId) : null,
      commandeId: draft.clientId && draft.commandeId ? Number(draft.commandeId) : null,
      contactId: draft.clientId && draft.contactId ? Number(draft.contactId) : null,
      description: joinTags(this.draft().tags, draft.description) || null,
      facturable: this.facturableCode(draft.facturation),
      tempsFacturable: tempsFacturable === null ? null : Math.round(tempsFacturable * 10000) / 10000,
    };
    const pointage = this.pointage();
    this.saving.set(true);
    (pointage ? this.api.update(pointage.id, input) : this.api.create(input)).subscribe({
      next: (saved) => this.activeModal.close({ saved } satisfies PointageModalResult),
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        const details = (error.error as { error?: ApiError } | null)?.error?.details ?? [];
        const byField: Record<string, string> = {};
        details.forEach((detail) => {
          const field = detail.field === 'debut' || detail.field === 'fin' ? 'horaire' : detail.field;
          byField[field] ??= detail.message;
        });
        this.errors.set(byField);
      },
    });
  }

  private facturableCode(facturation: Facturation): number {
    if (facturation === 'oui') return FACTURABLE.oui;
    if (facturation === 'non') return FACTURABLE.non;
    return facturationOf(this.facturableOrigine) === 'attente' ? this.facturableOrigine : FACTURABLE.enAttente;
  }

  async remove(): Promise<void> {
    const pointage = this.pointage();
    if (!pointage) {
      return;
    }
    const start = new Date(pointage.debut);
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Supprimer le pointage ?',
      text: `Ce pointage du ${JOURS_LONGS[(start.getDay() + 6) % 7]} de ${hm(start)} à ${hm(new Date(pointage.fin))} sera supprimé.`,
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      reverseButtons: true,
      customClass: { confirmButton: 'swal-confirm-danger' },
    });
    if (!result.isConfirmed) {
      return;
    }
    this.api.delete(pointage.id).subscribe(() => this.activeModal.close({ deleted: pointage.id } satisfies PointageModalResult));
  }
}
