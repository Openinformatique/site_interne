import { Component, computed, inject, signal } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FileText, LucideAngularModule, X } from 'lucide-angular';
import Swal from 'sweetalert2';

import { PointagesApi } from '../../../../core/api/pointages-api.service';
import { AuthStore } from '../../../../core/auth/auth.store';
import { PointageCommandeOption, PointagesReference } from '../../../../core/models/pointage.model';
import { normalize } from '../pointages.utils';
import { ajouterTag, erreursExport, moisEnCours, moisPrecedent } from './export-cfl.utils';

/** Ouvre la fenêtre (Pointages › Éditions › Export (format CFL)). */
export function ouvrirExportCfl(modal: NgbModal): void {
  modal.open(ExportCflModalComponent, {
    backdropClass: 'fiche-modal-backdrop',
    modalDialogClass: 'fiche-modal fiche-modal-export-cfl',
    animation: true,
  });
}

/**
 * Fenêtre « Export (format CFL) » : période (mois en cours par défaut),
 * client obligatoire, commande, personne, type et tags (pastilles, ou
 * uniquement les pointages sans tag) ; le PDF « Travaux réalisés » s'ouvre
 * dans un nouvel onglet du navigateur. Les profils autres qu'Admin et
 * Direction n'exportent que leurs propres pointages (liste figée).
 */
@Component({
  selector: 'app-export-cfl-modal',
  imports: [LucideAngularModule],
  templateUrl: './export-cfl-modal.component.html',
  styleUrl: './export-cfl-modal.component.scss',
})
export class ExportCflModalComponent {
  private readonly activeModal = inject(NgbActiveModal);
  private readonly api = inject(PointagesApi);
  private readonly auth = inject(AuthStore);

  readonly X = X;
  readonly FileText = FileText;

  readonly reference = signal<PointagesReference>({ types: [], tags: [], personnes: [], clients: [] });
  readonly du = signal(moisEnCours().du);
  readonly au = signal(moisEnCours().au);
  readonly clientId = signal<number | null>(null);
  readonly commandes = signal<PointageCommandeOption[]>([]);
  readonly commandeId = signal<number | null>(null);
  readonly personneLocked = computed(() => !this.auth.isDirectionOrAdmin());
  readonly personneId = signal<string | null>(null);
  readonly typeAction = signal<string | null>(null);
  readonly tags = signal<string[]>([]);
  readonly tagInput = signal('');
  readonly tagFocus = signal(false);
  readonly sansTag = signal(false);
  readonly errors = signal<Record<string, string>>({});
  readonly opening = signal(false);

  readonly clients = computed(() =>
    [...this.reference().clients].sort((a, b) => (a.nom ?? '').localeCompare(b.nom ?? '', 'fr')),
  );
  readonly suggestions = computed(() => {
    const saisie = normalize(this.tagInput());
    return this.reference()
      .tags.filter((tag) => !this.tags().some((pris) => normalize(pris) === normalize(tag)))
      .filter((tag) => !saisie || normalize(tag).includes(saisie))
      .slice(0, 6);
  });
  readonly tagMenuOpen = computed(() => !this.sansTag() && this.tagFocus() && this.suggestions().length > 0);
  readonly tagHint = computed(() =>
    this.sansTag()
      ? 'Seuls les pointages dont la description ne commence par aucun tag sont repris.'
      : this.tags().length
        ? 'Pointages portant au moins un de ces tags.'
        : 'Aucun tag choisi : tous les pointages, avec ou sans tag.',
  );

  constructor() {
    this.api.reference().subscribe((reference) => {
      this.reference.set(reference);
      // Hors Admin / Direction : la personne est l'utilisateur lui-même.
      if (this.personneLocked()) {
        this.personneId.set(reference.personnes[0]?.id ?? this.auth.currentUser()?.id ?? null);
      }
    });
  }

  setDu(event: Event): void {
    this.du.set((event.target as HTMLInputElement).value);
    this.clearError('periode');
  }

  setAu(event: Event): void {
    this.au.set((event.target as HTMLInputElement).value);
    this.clearError('periode');
  }

  moisPrecedent(): void {
    const { du, au } = moisPrecedent(this.du());
    this.du.set(du);
    this.au.set(au);
    this.clearError('periode');
  }

  /** Changer de client vide la commande et recharge les commandes du client. */
  setClient(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const clientId = value ? Number(value) : null;
    this.clientId.set(clientId);
    this.commandeId.set(null);
    this.commandes.set([]);
    this.clearError('client');
    if (clientId !== null) {
      this.api.clientOptions(clientId).subscribe(({ commandes }) => {
        if (this.clientId() === clientId) {
          this.commandes.set(commandes);
        }
      });
    }
  }

  setCommande(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.commandeId.set(value ? Number(value) : null);
  }

  setPersonne(event: Event): void {
    this.personneId.set((event.target as HTMLSelectElement).value || null);
  }

  setType(event: Event): void {
    this.typeAction.set((event.target as HTMLSelectElement).value || null);
  }

  // --- Tags : pastilles + saisie assistée (TAGS) ou tag libre ---------------

  onTagInput(event: Event): void {
    this.tagInput.set((event.target as HTMLInputElement).value);
    this.tagFocus.set(true);
  }

  onTagKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' || (event.key === 'Tab' && this.tagInput().trim())) {
      if (event.key === 'Enter') {
        event.preventDefault();
      }
      this.ajouter(this.tagInput());
    } else if (event.key === 'Backspace' && !this.tagInput() && this.tags().length) {
      this.tags.update((tags) => tags.slice(0, -1));
    }
  }

  onTagBlur(): void {
    this.ajouter(this.tagInput());
    this.tagFocus.set(false);
  }

  /** mousedown (avant le blur du champ) : la suggestion est ajoutée telle quelle. */
  choisirTag(tag: string, event: Event): void {
    event.preventDefault();
    this.ajouter(tag);
  }

  retirerTag(index: number): void {
    this.tags.update((tags) => tags.filter((_, i) => i !== index));
  }

  /** « Uniquement les pointages sans tag » : vide et grise le champ des tags. */
  setSansTag(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.sansTag.set(checked);
    if (checked) {
      this.tags.set([]);
      this.tagInput.set('');
    }
  }

  private ajouter(saisie: string): void {
    this.tags.set(ajouterTag(this.tags(), saisie, this.reference().tags));
    this.tagInput.set('');
  }

  // --- Validation ------------------------------------------------------------

  close(): void {
    this.activeModal.dismiss();
  }

  ouvrir(): void {
    const erreurs = erreursExport(this.du(), this.au(), this.clientId());
    this.errors.set(erreurs);
    const clientId = this.clientId();
    if (Object.keys(erreurs).length > 0 || clientId === null || this.opening()) {
      return;
    }
    // Onglet ouvert pendant le clic (sinon bloqué par le navigateur), rempli à réception.
    const tab = window.open('', '_blank');
    this.opening.set(true);
    this.api
      .exportCflPdf({
        du: this.du(),
        au: this.au(),
        clientId,
        commandeId: this.commandeId(),
        utilisateurId: this.personneId(),
        typeAction: this.typeAction(),
        tags: this.sansTag() ? [] : ajouterTag(this.tags(), this.tagInput(), this.reference().tags),
        sansTag: this.sansTag(),
      })
      .subscribe({
        next: ({ blob }) => {
          const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
          if (tab) {
            tab.location.href = url;
          } else {
            window.open(url, '_blank');
          }
          setTimeout(() => URL.revokeObjectURL(url), 60_000);
          this.activeModal.close();
        },
        error: () => {
          tab?.close();
          this.opening.set(false);
          void Swal.fire({ icon: 'error', title: "L'export n'a pas pu être généré.", text: 'Vérifiez les critères ; si le problème persiste, prévenez un administrateur.' });
        },
      });
  }

  private clearError(champ: string): void {
    this.errors.update((errors) => ({ ...errors, [champ]: '' }));
  }
}
