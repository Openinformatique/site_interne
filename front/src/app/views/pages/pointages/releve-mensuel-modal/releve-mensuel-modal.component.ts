import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ChevronLeft, ChevronRight, Clock, Download, FileSpreadsheet, FileText, Lock, LucideAngularModule, Printer, X } from 'lucide-angular';
import Swal from 'sweetalert2';

import { ContenuReleve, PointagesApi } from '../../../../core/api/pointages-api.service';
import { Pointage } from '../../../../core/models/pointage.model';
import { saveBlob } from '../../../../shared/utils/file-download';
import { bornesMois, moisProposes, recapitulatif } from './releve-mensuel.utils';

/** Personne proposée dans la liste (libellé « (moi) » compris). */
export interface ReleveMensuelPersonne {
  id: string;
  label: string;
}

/** PDF (détaillé ou synthétique) ou classeur Excel (détaillé). */
export type FormatReleve = 'pdf' | 'excel';

/** Ouvre la fenêtre (Pointages › Éditions › Relevé mensuel / Relevé mensuel (Excel)). */
export function ouvrirReleveMensuel(
  modal: NgbModal,
  personnes: ReleveMensuelPersonne[],
  personneId: string,
  verrouillee: boolean,
  format: FormatReleve = 'pdf',
): void {
  const ref = modal.open(ReleveMensuelModalComponent, {
    backdropClass: 'fiche-modal-backdrop',
    modalDialogClass: 'fiche-modal fiche-modal-releve',
    animation: true,
  });
  const instance = ref.componentInstance as ReleveMensuelModalComponent;
  instance.personnes.set(personnes);
  instance.personneId.set(personneId);
  instance.verrouillee.set(verrouillee);
  instance.format.set(format);
}

/**
 * Fenêtre « Relevé mensuel » (Pointages › Éditions) : personne (Admin et
 * Direction seulement, sinon l'utilisateur connecté), mois (24 derniers,
 * mois en cours par défaut), contenu détaillé ou synthétique (PDF
 * seulement) ; récapitulatif du mois. Le PDF s'ouvre dans un nouvel onglet du
 * navigateur ; le classeur Excel (détaillé) se télécharge.
 */
@Component({
  selector: 'app-releve-mensuel-modal',
  imports: [LucideAngularModule],
  templateUrl: './releve-mensuel-modal.component.html',
  styleUrl: './releve-mensuel-modal.component.scss',
})
export class ReleveMensuelModalComponent {
  private readonly activeModal = inject(NgbActiveModal);
  private readonly api = inject(PointagesApi);

  readonly X = X;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly Clock = Clock;
  readonly Download = Download;
  readonly FileSpreadsheet = FileSpreadsheet;
  readonly FileText = FileText;
  readonly Lock = Lock;
  readonly Printer = Printer;

  readonly personnes = signal<ReleveMensuelPersonne[]>([]);
  readonly personneId = signal('');
  readonly verrouillee = signal(true);
  readonly format = signal<FormatReleve>('pdf');
  readonly mois = moisProposes(new Date());
  readonly moisIndex = signal(0);
  readonly contenu = signal<ContenuReleve>('detail');
  readonly pointages = signal<Pointage[] | null>(null);
  readonly impression = signal(false);

  readonly moisChoisi = computed(() => this.mois[this.moisIndex()] ?? this.mois[0]!);
  readonly recap = computed(() => {
    const pointages = this.pointages();
    const { annee, mois } = this.moisChoisi();
    return pointages === null ? null : recapitulatif(pointages, annee, mois);
  });
  readonly aide = computed(() =>
    this.contenu() === 'synthese'
      ? "Une ligne par client et type d'action, avec ses commandes et le temps passé, sans le détail des pointages."
      : "Toutes les lignes de pointage, regroupées par client, type d'action et commande.",
  );
  readonly impossible = computed(() => this.impression() || !this.recap() || this.recap()!.vide);

  constructor() {
    // Récapitulatif rechargé à chaque changement de personne ou de mois.
    effect(() => {
      const personneId = this.personneId();
      const { annee, mois } = this.moisChoisi();
      if (personneId) {
        untracked(() => this.charger(personneId, annee, mois));
      }
    });
  }

  setPersonne(event: Event): void {
    this.personneId.set((event.target as HTMLSelectElement).value);
  }

  setMois(event: Event): void {
    this.moisIndex.set((event.target as HTMLSelectElement).selectedIndex);
  }

  /** ‹ : mois précédent (plus ancien) ; › : mois suivant. */
  decaler(sens: -1 | 1): void {
    const index = this.moisIndex() - sens;
    if (index >= 0 && index < this.mois.length) {
      this.moisIndex.set(index);
    }
  }

  close(): void {
    this.activeModal.dismiss();
  }

  valider(): void {
    if (this.impossible()) {
      return;
    }
    if (this.format() === 'excel') {
      this.telechargerExcel();
    } else {
      this.imprimer();
    }
  }

  /** Classeur Excel détaillé, téléchargé. */
  private telechargerExcel(): void {
    const { annee, mois } = this.moisChoisi();
    this.impression.set(true);
    this.api.releveMensuelExcel(this.personneId(), annee, mois).subscribe({
      next: ({ blob, filename }) => {
        saveBlob(blob, filename || 'Releve.xlsx');
        this.activeModal.close();
      },
      error: () => this.echec(),
    });
  }

  /** PDF ouvert dans un nouvel onglet du navigateur (visionneuse : impression, enregistrement). */
  private imprimer(): void {
    const { annee, mois } = this.moisChoisi();
    // Onglet ouvert pendant le clic (sinon bloqué par le navigateur), rempli à réception.
    const tab = window.open('', '_blank');
    this.impression.set(true);
    this.api.releveMensuelPdf(this.personneId(), annee, mois, this.contenu()).subscribe({
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
        this.echec();
      },
    });
  }

  private echec(): void {
    this.impression.set(false);
    void Swal.fire({ icon: 'error', title: "Le relevé n'a pas pu être généré.", text: 'Réessayez ; si le problème persiste, prévenez un administrateur.' });
  }

  private charger(personneId: string, annee: number, mois: number): void {
    this.pointages.set(null);
    const { du, au } = bornesMois(annee, mois);
    this.api.list(personneId, du, au).subscribe({
      next: (pointages) => {
        // Réponse périmée si la personne ou le mois a changé entre-temps.
        const courant = this.moisChoisi();
        if (this.personneId() === personneId && courant.annee === annee && courant.mois === mois) {
          this.pointages.set(pointages);
        }
      },
      error: () => this.pointages.set([]),
    });
  }
}
