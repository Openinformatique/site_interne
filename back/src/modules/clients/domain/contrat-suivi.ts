import { splitNomContact } from './contact-name';

/**
 * Règles du suivi d'un contrat (fenêtre du contrat, liste des contrats et
 * édition PDF « Suivi du contrat ») : crédit = commandes du contrat, débit =
 * pointages sur ces commandes, à partir de la première commande seulement.
 */

/**
 * Début du suivi : jour (« AAAA-MM-JJ ») de la première commande du contrat ;
 * null si aucune commande n'est datée (aucun pointage écarté).
 */
export function debutDuSuivi(
  datesCommandes: readonly (string | null)[],
): string | null {
  const dates = datesCommandes.filter((date): date is string => !!date);
  return dates.length === 0 ? null : dates.reduce((a, b) => (a < b ? a : b));
}

/** Un pointage antérieur à la première commande n'est pas repris. */
export function pointageDansLeSuivi(
  jour: string | null,
  debut: string | null,
): boolean {
  return debut === null || (jour !== null && jour >= debut);
}

/** Demandeur d'un pointage : contact « NOM,Prénom » affiché « NOM Prénom ». */
export function nomDemandeur(nomContact: string | null): string | null {
  const { nom, prenom } = splitNomContact(nomContact);
  const complet = [nom, prenom].filter(Boolean).join(' ');
  return complet || null;
}
