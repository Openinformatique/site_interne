import { Injectable, inject } from '@angular/core';

import { ClientTrouve, CommandeTrouvee, PointageTrouve } from '../models/recherche.model';
import { PointagesNavigation } from './pointages-navigation.service';
import { TabsService } from './tabs.service';

/** Ouverture des résultats de la recherche globale (barre du haut et onglet « Recherche »). */
@Injectable({ providedIn: 'root' })
export class RechercheNavigation {
  private readonly tabsService = inject(TabsService);
  private readonly pointagesNavigation = inject(PointagesNavigation);

  /** Onglet « Recherche : terme » (un onglet par recherche). */
  ouvrirResultats(q: string): void {
    const terme = q.trim().replace(/\s+/g, ' ');
    this.tabsService.openTab(`/recherche?q=${encodeURIComponent(terme)}`, `Recherche : ${terme}`);
  }

  ouvrirClient(client: ClientTrouve): void {
    this.tabsService.openTab(`/clients/${client.id}`, client.raisonSociale || client.codeClient || `Client ${client.id}`);
  }

  ouvrirCommande(commande: CommandeTrouvee): void {
    this.tabsService.openTab(`/commandes/${commande.id}`, `Commande ${numeroCommande(commande)}`);
  }

  /** Écran Pointages de la personne, sur la semaine du pointage. */
  ouvrirPointage(pointage: PointageTrouve): void {
    const [annee, mois, jour] = pointage.jour.split('-').map(Number);
    this.pointagesNavigation.ouvrirSemaine(new Date(annee!, mois! - 1, jour!), pointage.utilisateurId);
  }
}

export function numeroCommande(commande: CommandeTrouvee): string {
  return commande.numeroCommande || commande.numeroDevis || String(commande.id);
}
