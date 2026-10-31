import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { LucideAngularModule, TriangleAlert } from 'lucide-angular';
import { catchError, of } from 'rxjs';

import { CommandesApi } from '../../../../../core/api/commandes-api.service';
import { CommandeTemps } from '../../../../../core/models/commande.model';
import { frDate, initiales } from '../../../clients/client-fiche/client-fiche.utils';
import { avancement, formatJoursCourts } from '../commande-fiche.utils';

type Vue = 'synth' | 'detail';

/**
 * Encart « Temps passé » de la fiche commande : avancement des jours
 * facturables pointés par rapport aux jours prévus (saisie en cours), cumul
 * par personne (synthétique) ou pointage par pointage (détaillé).
 * Lecture seule : les pointages se saisissent ailleurs.
 */
@Component({
  selector: 'app-commande-temps',
  imports: [LucideAngularModule],
  templateUrl: './commande-temps.component.html',
  styleUrl: './commande-temps.component.scss',
})
export class CommandeTempsComponent {
  private readonly commandesApi = inject(CommandesApi);

  readonly commandeId = input.required<number>();
  readonly joursPrevus = input.required<number>();
  readonly joursCommandes = input.required<number>();

  readonly TriangleAlert = TriangleAlert;
  readonly frDate = frDate;
  readonly jours = formatJoursCourts;
  readonly initiales = initiales;

  readonly temps = signal<CommandeTemps>({ personnes: [], pointages: [] });
  readonly loaded = signal(false);
  readonly vue = signal<Vue>('synth');

  readonly total = computed(() => this.temps().personnes.reduce((sum, personne) => sum + personne.jours, 0));
  readonly avancement = computed(() => avancement(this.total(), this.joursPrevus()));
  readonly reste = computed(() => Math.abs(this.joursPrevus() - this.total()));
  readonly pourcentageArrondi = computed(() => Math.round(this.avancement().pourcentage ?? 0));
  readonly largeurBarre = computed(() => Math.min(100, this.avancement().pourcentage ?? 0));

  constructor() {
    effect(() => {
      const id = this.commandeId();
      untracked(() => this.load(id));
    });
  }

  /** Part des jours prévus d'une personne (largeur de sa barre, en %). */
  part(jours: number): number {
    const prevus = this.joursPrevus();
    return prevus > 0 ? (jours / prevus) * 100 : 0;
  }

  round(value: number): number {
    return Math.round(value);
  }

  min100(value: number): number {
    return Math.min(100, value);
  }

  private load(id: number): void {
    this.commandesApi
      .temps(id)
      .pipe(catchError(() => of({ personnes: [], pointages: [] } as CommandeTemps)))
      .subscribe((temps) => {
        this.temps.set(temps);
        this.loaded.set(true);
      });
  }
}
