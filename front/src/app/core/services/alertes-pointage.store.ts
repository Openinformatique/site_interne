import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, interval, merge } from 'rxjs';

import { PointagesApi } from '../api/pointages-api.service';
import { JourIncomplet } from '../models/pointage.model';

/** Rafraîchissement périodique (ex. pointage saisi depuis un autre poste). */
const PERIODE_MS = 5 * 60_000;

/**
 * Alertes de la cloche : jours ouvrés incomplets de l'utilisateur connecté.
 * Rechargées au démarrage, après chaque pointage enregistré ou supprimé dans
 * l'application, à l'ouverture de la cloche et toutes les 5 minutes.
 */
@Injectable({ providedIn: 'root' })
export class AlertesPointageStore {
  private readonly api = inject(PointagesApi);
  private readonly destroyRef = inject(DestroyRef);
  private suivi?: Subscription;

  readonly alertes = signal<JourIncomplet[]>([]);

  /** Démarre le suivi (barre du haut) ; sans effet s'il est déjà actif. */
  demarrer(destroyRef: DestroyRef): void {
    if (this.suivi && !this.suivi.closed) {
      return;
    }
    // Nouvelle session (barre recréée après une connexion) : rien de l'utilisateur précédent.
    this.alertes.set([]);
    this.rafraichir();
    this.suivi = merge(this.api.changed$, interval(PERIODE_MS))
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(() => this.rafraichir());
  }

  rafraichir(): void {
    this.api
      .alertes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (alertes) => this.alertes.set(alertes), error: () => undefined });
  }
}
