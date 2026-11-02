import { Injectable, inject, signal } from '@angular/core';

import { TabsService } from './tabs.service';

/** Semaine (jour quelconque de la semaine) et personne à afficher. */
export interface DemandePointages {
  jour: Date;
  /** null : l'utilisateur connecté. */
  personneId: string | null;
}

/**
 * Ouvre l'écran Pointages (onglet unique, conservé) sur une semaine donnée,
 * pour l'utilisateur connecté (cloche d'alertes) ou une personne donnée
 * (recherche globale) : la demande est lue par la page à sa création ou, si
 * elle est déjà ouverte, dès qu'elle est émise.
 */
@Injectable({ providedIn: 'root' })
export class PointagesNavigation {
  private readonly tabsService = inject(TabsService);

  /** Demande en attente de prise en compte par la page. */
  readonly demande = signal<DemandePointages | null>(null);

  ouvrirSemaine(jour: Date, personneId: string | null = null): void {
    this.demande.set({ jour, personneId });
    this.tabsService.openTab('/pointages', 'Pointages');
  }

  /** Lit et efface la demande en attente. */
  consommer(): DemandePointages | null {
    const demande = this.demande();
    this.demande.set(null);
    return demande;
  }
}
