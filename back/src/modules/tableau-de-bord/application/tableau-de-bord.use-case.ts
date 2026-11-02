import { Inject, Injectable } from '@nestjs/common';
import { jourMetier } from '../../../common/utils/sql-date.util';
import { congesDeLaFenetre, type Conge } from '../domain/conges';
import { ajouterJours, ecartJours } from '../domain/jours';
import {
  TABLEAU_DE_BORD,
  type CommandeALivrer,
  type ContratARenouveler,
  type TableauDeBordPort,
} from '../domain/tableau-de-bord.port';

/** Contrat à renouveler : il lui reste moins de ce nombre d'heures… */
export const RESTANT_MAXIMUM = 1;
/** …et son crédit total dépasse ce nombre d'heures. */
export const CREDIT_MINIMUM = 1;
/** Horizon des commandes à livrer, en jours après aujourd'hui. */
export const HORIZON_COMMANDES = 14;
/** Fenêtre des congés : aujourd'hui et les 14 jours suivants. */
export const FENETRE_CONGES = 15;
/**
 * Marge lue de part et d'autre de la fenêtre des congés : un congé qui la
 * déborde est reconstitué en entier (durée totale, reprise).
 */
const MARGE_CONGES = 62;

export interface CongesDuTableau {
  du: string;
  au: string;
  aujourdhui: string;
  conges: Conge[];
}

/** Modules du tableau de bord (voir README.md). */
@Injectable()
export class TableauDeBordUseCase {
  constructor(
    @Inject(TABLEAU_DE_BORD) private readonly port: TableauDeBordPort,
  ) {}

  /** Contrats de plus d'1 h de crédit dont il reste moins d'1 h, du restant le plus bas au plus haut. */
  async contratsARenouveler(
    aujourdhui = jourMetier(new Date()),
  ): Promise<ContratARenouveler[]> {
    const candidats = await this.port.contratsCandidats(aujourdhui);
    const suivis = await this.port.suivis(
      candidats.map((contrat) => contrat.contratId),
      await this.port.heuresParJour(),
    );
    return candidats
      .flatMap((contrat) => {
        const suivi = suivis.get(contrat.contratId);
        if (
          !suivi ||
          suivi.credit <= CREDIT_MINIMUM ||
          suivi.credit - suivi.debit >= RESTANT_MAXIMUM
        ) {
          return [];
        }
        const consommation = suivi.debit / suivi.credit;
        return [
          {
            ...contrat,
            joursAvantEcheance: contrat.dateEcheance
              ? ecartJours(aujourdhui, contrat.dateEcheance)
              : null,
            credit: round4(suivi.credit),
            debit: round4(suivi.debit),
            restant: round4(suivi.credit - suivi.debit),
            consommation: round4(consommation),
          },
        ];
      })
      .sort(
        (a, b) =>
          a.restant - b.restant ||
          (a.raisonSociale ?? '').localeCompare(b.raisonSociale ?? '', 'fr'),
      );
  }

  /** Commandes en retard ou à livrer dans les 2 semaines, du plus en retard au plus lointain. */
  async commandesALivrer(
    aujourdhui = jourMetier(new Date()),
  ): Promise<CommandeALivrer[]> {
    const heuresParJour = await this.port.heuresParJour();
    const commandes = await this.port.commandesALivrer(
      ajouterJours(aujourdhui, HORIZON_COMMANDES),
    );
    return commandes.map(({ heuresPointees, ...commande }) => ({
      ...commande,
      joursAvantDelai: ecartJours(aujourdhui, commande.delai),
      joursPasses: round4(heuresPointees / heuresParJour),
    }));
  }

  /** Congés touchant les 15 prochains jours (aujourd'hui compris), de toute l'équipe. */
  async conges(aujourdhui = jourMetier(new Date())): Promise<CongesDuTableau> {
    const au = ajouterJours(aujourdhui, FENETRE_CONGES - 1);
    // Bornes larges d'un jour : le jour exact est situé à Paris ensuite.
    const pointages = await this.port.absences(
      new Date(`${ajouterJours(aujourdhui, -MARGE_CONGES - 1)}T00:00:00Z`),
      new Date(`${ajouterJours(au, MARGE_CONGES + 1)}T00:00:00Z`),
    );
    return {
      du: aujourdhui,
      au,
      aujourdhui,
      conges: congesDeLaFenetre(
        pointages,
        { du: aujourdhui, au, aujourdhui },
        await this.port.heuresParJour(),
      ),
    };
  }
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
