import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, WritableSignal, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { CircleCheck, Clock, Gauge, LucideAngularModule, RefreshCw, TreePalm } from 'lucide-angular';
import Swal from 'sweetalert2';

import { CommandesApi } from '../../../core/api/commandes-api.service';
import { TableauDeBordApi } from '../../../core/api/tableau-de-bord-api.service';
import {
  CommandeALivrer,
  Conge,
  CongesDuTableau,
  ContratARenouveler,
  DureeConge,
  JourDeConge,
} from '../../../core/models/tableau-de-bord.model';
import { TabsService } from '../../../core/services/tabs.service';
import { UiAccessService } from '../../../core/ui-access/ui-access.service';
import { UiVisibleDirective } from '../../../core/ui-access/ui-visible.directive';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { frDate } from '../clients/client-fiche/client-fiche.utils';
import { DASHBOARD_UI_KEYS } from './access/dashboard-access.keys';

/** Échéance de contrat signalée « Dans N j » jusqu'à ce nombre de jours. */
const ECHEANCE_PROCHE = 30;
/** Commande « à échéance » (orange) jusqu'à ce nombre de jours, au-delà : neutre. */
const DELAI_PROCHE = 7;

const JOURS_SEMAINE = ['di', 'lu', 'ma', 'me', 'je', 've', 'sa'];

type Severite = 'danger' | 'warning' | 'soon' | 'info';

/** Données d'un module : null pendant le chargement, 'erreur' si l'appel échoue. */
type Etat<T> = T | null | 'erreur';

interface Badge {
  classe: Severite;
  texte: string;
}

interface ColonneJour {
  jour: string;
  libelle: string;
  numero: number;
  weekEnd: boolean;
  aujourdhui: boolean;
}

/**
 * Tableau de bord : contrats à renouveler, commandes à livrer, congés des
 * 15 prochains jours. Chaque module est masquable par l'administration des
 * accès UI ; un module masqué n'est pas chargé. Maquette validée le 02/11/2026.
 */
@Component({
  selector: 'app-dashboard',
  imports: [LucideAngularModule, UiVisibleDirective, EmptyStateComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly api = inject(TableauDeBordApi);
  private readonly commandesApi = inject(CommandesApi);
  private readonly confirmService = inject(ConfirmService);
  private readonly tabsService = inject(TabsService);
  private readonly uiAccess = inject(UiAccessService);
  private readonly destroyRef = inject(DestroyRef);

  readonly UiKeys = DASHBOARD_UI_KEYS;
  readonly icons = { gauge: Gauge, clock: Clock, conges: TreePalm, renouveler: RefreshCw, cloturer: CircleCheck };
  readonly frDate = frDate;

  readonly contrats = signal<Etat<ContratARenouveler[]>>(null);
  readonly commandes = signal<Etat<CommandeALivrer[]>>(null);
  readonly conges = signal<Etat<CongesDuTableau>>(null);
  /** Commande en cours de clôture (bouton désactivé). */
  readonly clotureEnCours = signal<number | null>(null);

  readonly contratsEpuises = computed(() => liste(this.contrats()).filter((c) => c.restant <= 0).length);
  readonly contratsBientotEpuises = computed(() => liste(this.contrats()).length - this.contratsEpuises());
  readonly commandesEnRetard = computed(() => liste(this.commandes()).filter((c) => c.joursAvantDelai < 0).length);
  readonly commandesAVenir = computed(() => liste(this.commandes()).length - this.commandesEnRetard());

  readonly congesData = computed(() => {
    const conges = this.conges();
    return conges && conges !== 'erreur' ? conges : null;
  });
  readonly absentsAujourdhui = computed(
    () => new Set(this.congesData()?.conges.filter((c) => c.absentAujourdhui).map((c) => c.utilisateurId)).size,
  );
  readonly personnesEnConge = computed(() => new Set(this.congesData()?.conges.map((c) => c.utilisateurId)).size);
  readonly colonnes = computed<ColonneJour[]>(() => {
    const data = this.congesData();
    if (!data) {
      return [];
    }
    const colonnes: ColonneJour[] = [];
    for (let jour = data.du; jour <= data.au; jour = ajouterJours(jour, 1)) {
      const jourSemaine = new Date(`${jour}T00:00:00Z`).getUTCDay();
      colonnes.push({
        jour,
        libelle: JOURS_SEMAINE[jourSemaine]!,
        numero: Number(jour.slice(8, 10)),
        weekEnd: jourSemaine === 0 || jourSemaine === 6,
        aujourdhui: jour === data.aujourdhui,
      });
    }
    return colonnes;
  });

  constructor() {
    this.charger();
    // Une commande créée ou modifiée (renouvellement, délai, clôture) change
    // les contrats et les commandes : la page, conservée dans son onglet, suit.
    this.commandesApi.changed$.pipe(takeUntilDestroyed())
      .subscribe(() => this.charger(false));
  }

  private charger(avecConges = true): void {
    this.chargerModule(DASHBOARD_UI_KEYS.CONTRATS_SECTION, this.api.contratsARenouveler(), this.contrats);
    this.chargerModule(DASHBOARD_UI_KEYS.COMMANDES_SECTION, this.api.commandesALivrer(), this.commandes);
    if (avecConges) {
      this.chargerModule(DASHBOARD_UI_KEYS.CONGES_SECTION, this.api.conges(), this.conges);
    }
  }

  private chargerModule<T>(cle: string, source: Observable<T>, cible: WritableSignal<Etat<T>>): void {
    if (!this.uiAccess.isVisible(cle)) {
      return;
    }
    source.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => cible.set(data),
      error: () => cible.set('erreur'),
    });
  }

  // --- Actions ----------------------------------------------------------------

  /** Nouvelle commande sur le client et le contrat. */
  renouveler(contrat: ContratARenouveler): void {
    this.tabsService.openTab(`/commandes/nouvelle?client=${contrat.clientId}&contrat=${contrat.contratId}`, 'Nouvelle commande');
  }

  ouvrirCommande(commande: CommandeALivrer): void {
    this.tabsService.openTab(`/commandes/${commande.id}`, `Commande ${numeroCommande(commande)}`);
  }

  /** Clôture à la date du jour, après confirmation ; la liste se recharge ensuite (changed$). */
  async cloturer(commande: CommandeALivrer, event: Event): Promise<void> {
    event.stopPropagation();
    const client = commande.raisonSociale || commande.codeClient || '';
    const confirme = await this.confirmService.confirm(
      'Clôturer la commande',
      `Clôturer la commande ${numeroCommande(commande)} (${client}) à la date du jour ?`,
      { confirmLabel: 'Clôturer' },
    );
    if (!confirme) {
      return;
    }
    this.clotureEnCours.set(commande.id);
    this.commandesApi.cloturer(commande.id).subscribe({
      next: () => {
        this.clotureEnCours.set(null);
        void Swal.fire({ icon: 'success', title: 'Commande clôturée', showConfirmButton: false, timer: 1400, width: 400 });
      },
      error: (error: HttpErrorResponse) => {
        this.clotureEnCours.set(null);
        const message = (error.error as { error?: { message?: string } } | null)?.error?.message;
        void Swal.fire({ icon: 'error', title: 'Clôture impossible', text: message || "La commande n'a pas pu être clôturée.", width: 400 });
      },
    });
  }

  // --- Affichage --------------------------------------------------------------

  liste = liste;

  visible(cle: string): boolean {
    return this.uiAccess.isVisible(cle);
  }

  heures(value: number): string {
    return `${value < 0 ? '−' : ''}${Math.abs(value).toFixed(2).replace('.', ',')} h`;
  }

  /** Heures sans unité (unité dans l'en-tête de colonne) : « 9 339,41 ». */
  nombre(value: number): string {
    return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace('-', '−');
  }

  jours(value: number | null): string {
    return value === null ? '—' : value.toFixed(2).replace('.', ',');
  }

  pourcentage(consommation: number): string {
    return `${Math.round(consommation * 100)} %`;
  }

  largeurJauge(consommation: number): string {
    return `${Math.min(100, consommation * 100)}%`;
  }

  severiteContrat(contrat: ContratARenouveler): Severite {
    return contrat.restant <= 0 ? 'danger' : 'warning';
  }

  badgeEcheance(contrat: ContratARenouveler): Badge | null {
    const jours = contrat.joursAvantEcheance;
    if (jours === null || jours > ECHEANCE_PROCHE) {
      return null;
    }
    return { classe: 'warning', texte: dans(jours) };
  }

  severiteCommande(commande: CommandeALivrer): Severite {
    if (commande.joursAvantDelai < 0) {
      return 'danger';
    }
    return commande.joursAvantDelai <= DELAI_PROCHE ? 'warning' : 'soon';
  }

  badgeDelai(commande: CommandeALivrer): Badge {
    const jours = commande.joursAvantDelai;
    if (jours < 0) {
      return { classe: 'danger', texte: `${-jours} j de retard` };
    }
    return { classe: this.severiteCommande(commande), texte: dans(jours) };
  }

  depasse(commande: CommandeALivrer): boolean {
    return commande.joursCommandes !== null && commande.joursPasses > commande.joursCommandes;
  }

  periode(conge: Conge): string {
    const { debut, fin } = conge;
    if (debut.jour === fin.jour) {
      return `Le ${jourMois(debut.jour)}${demi(debut.duree)}`;
    }
    return `Du ${jourMois(debut.jour)}${demi(debut.duree)} au ${jourMois(fin.jour)}${demi(fin.duree)}`;
  }

  badgeConge(conge: Conge): Badge {
    if (conge.joursAvantDebut <= 0) {
      return { classe: 'info', texte: `En cours · retour le ${jourMois(conge.retour.jour)}${demi(conge.retour.duree)}` };
    }
    return { classe: 'soon', texte: dans(conge.joursAvantDebut) };
  }

  nbJours(value: number): string {
    return String(value).replace('.', ',');
  }

  /** Classe du bloc de la frise pour un jour : congé (entier, demi), férié ou rien. */
  bloc(conge: Conge, jour: string): string | null {
    const duree = conge.jours.find((j: JourDeConge) => j.jour === jour)?.duree;
    if (duree) {
      return { JOURNEE: 'blk', MATIN: 'blk matin', APRES_MIDI: 'blk apres-midi' }[duree];
    }
    return conge.feries.includes(jour) ? 'blk ferie' : null;
  }

  pluriel(nombre: number, singulier: string, pluriel: string): string {
    return `${nombre} ${nombre > 1 ? pluriel : singulier}`;
  }
}

function numeroCommande(commande: CommandeALivrer): string {
  return commande.numeroCommande || commande.numeroDevis || String(commande.id);
}

function liste<T>(etat: Etat<T[]>): T[] {
  return Array.isArray(etat) ? etat : [];
}

function dans(jours: number): string {
  return jours === 0 ? "Aujourd'hui" : `Dans ${jours} j`;
}

function demi(duree: DureeConge): string {
  return duree === 'MATIN' ? ' matin' : duree === 'APRES_MIDI' ? ' après-midi' : '';
}

/** AAAA-MM-JJ → JJ/MM. */
function jourMois(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

function ajouterJours(jour: string, nombre: number): string {
  const date = new Date(`${jour}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + nombre);
  return date.toISOString().slice(0, 10);
}
