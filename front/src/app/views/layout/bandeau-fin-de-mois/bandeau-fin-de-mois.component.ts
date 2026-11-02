import { Component, DestroyRef, ElementRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { CalendarCheck, FileText, LucideAngularModule } from 'lucide-angular';
import Swal from 'sweetalert2';

import { environment } from '../../../../environments/environment';
import { ContenuReleve, PointagesApi } from '../../../core/api/pointages-api.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { dateLocale, duMois, estDernierJourOuvre } from './fin-de-mois.utils';

/** Variable CSS portant la hauteur du bandeau (0 sans bandeau) : les pages à hauteur fixe la retranchent. */
const VARIABLE_HAUTEUR = '--bandeau-fin-de-mois-h';

/**
 * Bandeau du dernier jour ouvré du mois (sous la barre du haut) : rappel
 * d'envoyer le relevé mensuel et génération du relevé du mois de
 * l'utilisateur connecté (PDF détaillé ou synthétique, nouvel onglet).
 * Maquette validée le 02/11/2026. En développement, la date du jour peut
 * être simulée (environment.dateDuJourSimulee).
 */
@Component({
  selector: 'app-bandeau-fin-de-mois',
  imports: [LucideAngularModule],
  templateUrl: './bandeau-fin-de-mois.component.html',
  styleUrl: './bandeau-fin-de-mois.component.scss',
})
export class BandeauFinDeMoisComponent {
  private readonly api = inject(PointagesApi);
  private readonly auth = inject(AuthStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly icons = { calendrier: CalendarCheck, fichier: FileText };

  /** Date du jour, réévaluée chaque minute (application laissée ouverte d'un jour à l'autre). */
  private readonly aujourdhui = signal(dateDuJour());
  readonly visible = computed(() => estDernierJourOuvre(this.aujourdhui()));
  readonly titre = computed(() => `Dernier jour ouvré ${duMois(this.aujourdhui())}`);
  /** Relevé en cours de génération (bouton désactivé). */
  readonly enCours = signal<ContenuReleve | null>(null);

  constructor() {
    interval(60_000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.aujourdhui.set(dateDuJour()));

    // Hauteur publiée pour les pages à hauteur fixe (planning des pointages).
    // Hauteur du bandeau lui-même (0 s'il est masqué) ; la marge qui le place
    // sous la barre du haut remplace celle des onglets (styles/_vertical-wrapper.scss).
    const observer = new ResizeObserver(() => {
      const hauteur = this.host.nativeElement.querySelector<HTMLElement>('.bandeau')?.offsetHeight ?? 0;
      document.documentElement.style.setProperty(VARIABLE_HAUTEUR, `${hauteur}px`);
    });
    observer.observe(this.host.nativeElement);
    inject(DestroyRef).onDestroy(() => {
      observer.disconnect();
      document.documentElement.style.removeProperty(VARIABLE_HAUTEUR);
    });
  }

  /** Relevé du mois en cours de l'utilisateur connecté, ouvert dans un nouvel onglet. */
  ouvrirReleve(contenu: ContenuReleve): void {
    const utilisateurId = this.auth.currentUser()?.id;
    if (!utilisateurId || this.enCours()) {
      return;
    }
    const jour = this.aujourdhui();
    // Onglet ouvert pendant le clic (sinon bloqué par le navigateur), rempli à réception.
    const onglet = window.open('', '_blank');
    this.enCours.set(contenu);
    this.api.releveMensuelPdf(utilisateurId, jour.getFullYear(), jour.getMonth() + 1, contenu).subscribe({
      next: ({ blob }) => {
        this.enCours.set(null);
        const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        if (onglet) {
          onglet.location.href = url;
        } else {
          window.open(url, '_blank');
        }
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => {
        this.enCours.set(null);
        onglet?.close();
        void Swal.fire({ icon: 'error', title: "Le relevé n'a pas pu être généré.", text: 'Réessayez ; si le problème persiste, prévenez un administrateur.' });
      },
    });
  }
}

function dateDuJour(): Date {
  return dateLocale(environment.dateDuJourSimulee) ?? new Date();
}
