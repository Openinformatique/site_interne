import { Injectable, inject, signal } from '@angular/core';

import { TabsService } from './tabs.service';

/**
 * Ouvre l'écran Pointages (onglet unique, conservé) sur une semaine donnée,
 * pour l'utilisateur connecté : la demande est lue par la page à sa création
 * ou, si elle est déjà ouverte, dès qu'elle est émise.
 */
@Injectable({ providedIn: 'root' })
export class PointagesNavigation {
  private readonly tabsService = inject(TabsService);

  /** Jour demandé, en attente de prise en compte par la page. */
  readonly demande = signal<Date | null>(null);

  ouvrirSemaine(jour: Date): void {
    this.demande.set(jour);
    this.tabsService.openTab('/pointages', 'Pointages');
  }

  /** Lit et efface la demande en attente. */
  consommer(): Date | null {
    const jour = this.demande();
    this.demande.set(null);
    return jour;
  }
}
