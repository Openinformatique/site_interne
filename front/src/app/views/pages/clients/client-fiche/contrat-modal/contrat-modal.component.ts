import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { LucideAngularModule, Printer, X } from 'lucide-angular';

import { ClientsApi } from '../../../../../core/api/clients-api.service';
import { ApiError } from '../../../../../core/models/api.model';
import { Contrat, ContratMouvement } from '../../../../../core/models/client.model';
import {
  formatHeures,
  frDate,
  MouvementRow,
  mouvementsDetailles,
  mouvementsSynthetiques,
  todayIso,
  totaux,
} from '../client-fiche.utils';

type Vue = 'synth' | 'detail';
type Filtre = 'tout' | 'cmd' | 'pt';

interface ContratDraft {
  libelleContrat: string;
  dateMiseEnPlace: string;
  dateEcheance: string;
}

/**
 * Modale « Nouveau contrat » / « Modifier le contrat » : saisie, totaux du
 * suivi (heures) et mouvements (commandes = crédit, pointages = débit).
 * « Enregistrer » enregistre immédiatement ; la modale renvoie le contrat.
 */
@Component({
  selector: 'app-contrat-modal',
  imports: [LucideAngularModule],
  templateUrl: './contrat-modal.component.html',
  styleUrl: './contrat-modal.component.scss',
})
export class ContratModalComponent {
  private readonly activeModal = inject(NgbActiveModal);
  private readonly clientsApi = inject(ClientsApi);

  readonly X = X;
  readonly Printer = Printer;
  readonly frDate = frDate;
  readonly formatHeures = formatHeures;

  private clientId = 0;
  readonly contrat = signal<Contrat | null>(null);
  readonly draft = signal<ContratDraft>({ libelleContrat: '', dateMiseEnPlace: todayIso(), dateEcheance: '' });
  readonly errors = signal<Record<string, string>>({});
  readonly saving = signal(false);

  readonly mouvements = signal<ContratMouvement[]>([]);
  readonly vue = signal<Vue>('synth');
  readonly filtre = signal<Filtre>('tout');

  readonly vues: { value: Vue; label: string }[] = [
    { value: 'synth', label: 'Synthétique' },
    { value: 'detail', label: 'Détaillé' },
  ];
  readonly filtres: { value: Filtre; label: string }[] = [
    { value: 'tout', label: 'Tout' },
    { value: 'cmd', label: 'Commandes' },
    { value: 'pt', label: 'Pointages' },
  ];

  readonly title = computed(() => (this.contrat() ? 'Modifier le contrat' : 'Nouveau contrat'));

  /** Totaux : ceux du contrat, puis recalculés sur les mouvements chargés. */
  readonly totals = computed(() => {
    const contrat = this.contrat();
    if (this.mouvements().length > 0 || !contrat) {
      return totaux(this.mouvements());
    }
    return { credit: contrat.credit, debit: contrat.debit, restant: contrat.restant };
  });

  readonly rows = computed<MouvementRow[]>(() => {
    const rows = this.vue() === 'synth' ? mouvementsSynthetiques(this.mouvements()) : mouvementsDetailles(this.mouvements());
    const filtre = this.filtre();
    return rows.filter((row) => filtre === 'tout' || (filtre === 'cmd' ? row.kind === 'Commande' : row.kind !== 'Commande'));
  });

  /** À appeler juste après l'ouverture (contrat null = création). */
  init(clientId: number, contrat: Contrat | null): void {
    this.clientId = clientId;
    this.contrat.set(contrat);
    if (contrat) {
      this.draft.set({
        libelleContrat: contrat.libelleContrat ?? '',
        dateMiseEnPlace: contrat.dateMiseEnPlace ?? '',
        dateEcheance: contrat.dateEcheance ?? '',
      });
      this.clientsApi.mouvements(clientId, contrat.id).subscribe((mouvements) => this.mouvements.set(mouvements));
    }
  }

  set(field: keyof ContratDraft, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.draft.update((draft) => ({ ...draft, [field]: value }));
    this.errors.update((errors) => ({ ...errors, [field]: '' }));
  }

  close(): void {
    this.activeModal.dismiss();
  }

  /** Impression du suivi : prévue plus tard, sans effet pour l'instant. */
  print(): void {}

  save(): void {
    const draft = this.draft();
    const missing = (['libelleContrat', 'dateMiseEnPlace'] as const).filter((field) => !draft[field].trim());
    if (missing.length > 0) {
      this.errors.set(Object.fromEntries(missing.map((field) => [field, 'Champ obligatoire.'])));
      return;
    }
    this.saving.set(true);
    this.clientsApi
      .saveContrat(this.clientId, this.contrat()?.id ?? null, {
        libelleContrat: draft.libelleContrat.trim(),
        dateMiseEnPlace: draft.dateMiseEnPlace,
        dateEcheance: draft.dateEcheance || null,
      })
      .subscribe({
        next: (contrat) => this.activeModal.close(contrat),
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          const details = (error.error as { error?: ApiError } | null)?.error?.details ?? [];
          this.errors.set(Object.fromEntries(details.map((detail) => [detail.field, detail.message])));
        },
      });
  }
}
