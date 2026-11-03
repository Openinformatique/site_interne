import { splitNomContact } from './contact-name';

/**
 * Règles du suivi d'un contrat, communes à toute l'application (liste et
 * fenêtre des contrats, éditions PDF « Suivi du contrat » et contrats
 * d'assistance, tableau de bord) : crédit = commandes du contrat, débit =
 * pointages sur ces commandes, les unes comme les autres à partir de la
 * **date de mise en place du contrat** seulement.
 */

/**
 * Une commande datée (commande, sinon devis : `jour`) d'avant la mise en
 * place du contrat (`debut`) n'est pas reprise ; sans date de mise en place,
 * toutes les commandes le sont.
 */
export function commandeDansLeSuivi(
  jour: string | null,
  debut: string | null,
): boolean {
  return debut === null || (jour !== null && jour >= debut);
}

/**
 * Un pointage antérieur à la date de mise en place du contrat (`debut`,
 * « AAAA-MM-JJ ») n'est pas repris ; sans date de mise en place, tous les
 * pointages le sont.
 */
export function pointageDansLeSuivi(
  jour: string | null,
  debut: string | null,
): boolean {
  return debut === null || (jour !== null && jour >= debut);
}

/**
 * Mouvement repris dans un suivi arrêté à une date (incluse) ; sans date
 * d'arrêté, tous les mouvements sont repris.
 */
export function mouvementArrete(
  jour: string | null,
  arreteAu: string | null,
): boolean {
  return arreteAu === null || (jour !== null && jour <= arreteAu);
}

/**
 * Contrat en cours à une date : mis en place au plus tard ce jour-là et non
 * échu (sans échéance, ou échéance ce jour-là ou après).
 */
export function contratEnCours(
  contrat: { dateMiseEnPlace: string | null; dateEcheance: string | null },
  jour: string,
): boolean {
  return (
    contrat.dateMiseEnPlace !== null &&
    contrat.dateMiseEnPlace <= jour &&
    (contrat.dateEcheance === null || contrat.dateEcheance >= jour)
  );
}

/** Demandeur d'un pointage : contact « NOM,Prénom » affiché « NOM Prénom ». */
export function nomDemandeur(nomContact: string | null): string | null {
  const { nom, prenom } = splitNomContact(nomContact);
  const complet = [nom, prenom].filter(Boolean).join(' ');
  return complet || null;
}
