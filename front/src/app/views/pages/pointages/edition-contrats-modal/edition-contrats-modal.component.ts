import { Component, computed, inject, signal } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Download, FileText, LucideAngularModule, X } from 'lucide-angular';
import Swal from 'sweetalert2';

import { ClientsApi } from '../../../../core/api/clients-api.service';
import { ContratAssistance } from '../../../../core/models/client.model';
import { saveBlob } from '../../../../shared/utils/file-download';
import { isoDate } from '../pointages.utils';
import { clientsAvecContrat, contratsRetenus, groupesAvecContrat, libelleCompteur } from './edition-contrats.utils';

/** Ouvre la fenêtre (Pointages › Éditions › Contrats d'assistance). */
export function ouvrirEditionContrats(modal: NgbModal): void {
  modal.open(EditionContratsModalComponent, {
    backdropClass: 'fiche-modal-backdrop',
    modalDialogClass: 'fiche-modal fiche-modal-edition-contrats',
    animation: true,
  });
}

/**
 * Fenêtre « Édition des contrats d'assistance » (Pointages › Éditions) :
 * date d'arrêté (jour même par défaut), groupe → client → contrat en
 * cascade, compteur des contrats édités ; télécharge un zip d'un PDF
 * « Suivi du contrat » par contrat en cours à la date d'arrêté.
 */
@Component({
  selector: 'app-edition-contrats-modal',
  imports: [LucideAngularModule],
  templateUrl: './edition-contrats-modal.component.html',
  styleUrl: './edition-contrats-modal.component.scss',
})
export class EditionContratsModalComponent {
  private readonly activeModal = inject(NgbActiveModal);
  private readonly clientsApi = inject(ClientsApi);

  readonly X = X;
  readonly Download = Download;
  readonly FileText = FileText;

  readonly contrats = signal<ContratAssistance[]>([]);
  readonly arreteAu = signal(isoDate(new Date()));
  readonly groupe = signal<string | null>(null);
  readonly clientId = signal<number | null>(null);
  readonly contratId = signal<number | null>(null);
  readonly downloading = signal(false);

  readonly groupes = computed(() => groupesAvecContrat(this.contrats()));
  readonly clients = computed(() => clientsAvecContrat(this.contrats(), this.groupe()));
  readonly contratsDuClient = computed(() => this.contrats().filter((contrat) => contrat.clientId === this.clientId()));
  readonly retenus = computed(() =>
    contratsRetenus(this.contrats(), {
      arreteAu: this.arreteAu(),
      groupe: this.groupe(),
      clientId: this.clientId(),
      contratId: this.contratId(),
    }),
  );
  readonly compteur = computed(() => libelleCompteur(this.retenus().length, this.arreteAu()));
  readonly impossible = computed(() => this.retenus().length === 0 || this.downloading());

  constructor() {
    this.clientsApi.contratsAssistance().subscribe((contrats) => this.contrats.set(contrats));
  }

  setArreteAu(event: Event): void {
    this.arreteAu.set((event.target as HTMLInputElement).value);
  }

  /** Cascade : changer le groupe vide le client et le contrat. */
  setGroupe(event: Event): void {
    this.groupe.set((event.target as HTMLSelectElement).value || null);
    this.clientId.set(null);
    this.contratId.set(null);
  }

  /** Cascade : changer le client vide le contrat. */
  setClient(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.clientId.set(value ? Number(value) : null);
    this.contratId.set(null);
  }

  setContrat(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.contratId.set(value ? Number(value) : null);
  }

  close(): void {
    this.activeModal.dismiss();
  }

  telecharger(): void {
    if (this.impossible()) {
      return;
    }
    const nombre = this.retenus().length;
    this.downloading.set(true);
    this.clientsApi
      .editionContrats({ arreteAu: this.arreteAu(), groupe: this.groupe(), clientId: this.clientId(), contratId: this.contratId() })
      .subscribe({
        next: ({ blob, filename }) => {
          saveBlob(blob, filename || 'Contrats assistance.zip');
          this.activeModal.close(nombre);
          const title = `Téléchargement de « ${filename} » (${nombre} PDF).`;
          void Swal.fire({ toast: true, position: 'bottom-end', title, showConfirmButton: false, timer: 2600, customClass: { popup: 'fiche-toast' } });
        },
        error: () => {
          this.downloading.set(false);
          void Swal.fire({ icon: 'error', title: "L'édition n'a pas pu être générée.", text: 'Réessayez ; si le problème persiste, prévenez un administrateur.' });
        },
      });
  }
}
