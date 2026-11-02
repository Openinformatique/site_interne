import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Building2, CalendarClock, ClipboardList, LucideAngularModule } from 'lucide-angular';

import { RechercheApi } from '../../../core/api/recherche-api.service';
import { ResultatRecherche } from '../../../core/models/recherche.model';
import { RechercheNavigation, numeroCommande } from '../../../core/services/recherche-navigation.service';
import { SurligneComponent } from '../../../shared/components/surligne/surligne.component';
import { frDate } from '../clients/client-fiche/client-fiche.utils';

/** Résultats affichés au plus par catégorie (les plus pertinents ou récents). */
const LIMITE = 200;

/**
 * Onglet « Recherche : terme » (recherche globale de la barre du haut) :
 * clients, commandes et pointages contenant chacun des mots ; un onglet par
 * recherche (`/recherche?q=…`). Maquette validée le 02/11/2026.
 */
@Component({
  selector: 'app-recherche-page',
  imports: [LucideAngularModule, SurligneComponent],
  templateUrl: './recherche-page.component.html',
  styleUrl: './recherche-page.component.scss',
})
export class RecherchePageComponent {
  private readonly api = inject(RechercheApi);
  readonly navigation = inject(RechercheNavigation);

  readonly icons = { clients: Building2, commandes: ClipboardList, pointages: CalendarClock };
  readonly limite = LIMITE;
  readonly frDate = frDate;
  readonly numeroCommande = numeroCommande;

  readonly q = (inject(ActivatedRoute).snapshot.queryParamMap.get('q') ?? '').trim();
  readonly resultat = signal<ResultatRecherche | null>(null);
  readonly erreur = signal(false);

  constructor() {
    this.api
      .rechercher(this.q, LIMITE)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (resultat) => this.resultat.set(resultat),
        error: () => this.erreur.set(true),
      });
  }

  heures(value: number): string {
    return `${value.toFixed(2).replace('.', ',')} h`;
  }

  pluriel(nombre: number, singulier: string, pluriel: string): string {
    return `${nombre.toLocaleString('fr-FR')} ${nombre > 1 ? pluriel : singulier}`;
  }

  /** « 200 premiers sur 7 484 » quand la liste est tronquée. */
  partiel(total: number, affiches: number): string | null {
    return total > affiches ? `${affiches} premiers sur ${total.toLocaleString('fr-FR')}` : null;
  }

  aller(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
