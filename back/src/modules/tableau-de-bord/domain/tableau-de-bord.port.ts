/** Contrat consommé à 95 % ou plus (module « Contrats à renouveler »). */
export interface ContratARenouveler {
  contratId: number;
  libelleContrat: string | null;
  dateEcheance: string | null;
  /** Jours jusqu'à l'échéance (0 = aujourd'hui), null sans échéance. */
  joursAvantEcheance: number | null;
  clientId: number;
  codeClient: string | null;
  raisonSociale: string | null;
  /** Heures. */
  credit: number;
  debit: number;
  restant: number;
  /** Débit ÷ crédit (1 = 100 %). */
  consommation: number;
}

/** Commande non clôturée en retard ou à livrer prochainement. */
export interface CommandeALivrer {
  id: number;
  clientId: number;
  codeClient: string | null;
  raisonSociale: string | null;
  libelle: string | null;
  numeroCommande: string | null;
  numeroDevis: string | null;
  delai: string;
  /** Jours jusqu'au délai : négatif = retard, 0 = aujourd'hui. */
  joursAvantDelai: number;
  joursCommandes: number | null;
  joursPasses: number;
}

/** Contrat non échu d'un client actif, avant calcul du suivi. */
export interface ContratCandidat {
  contratId: number;
  libelleContrat: string | null;
  dateEcheance: string | null;
  clientId: number;
  codeClient: string | null;
  raisonSociale: string | null;
}

/** Suivi d'un contrat en heures (crédit / débit, règles de contrat-suivi.ts). */
export interface SuiviContrat {
  credit: number;
  debit: number;
}

/** Commande à livrer telle que lue en base (heures pointées, non converties). */
export interface CommandeALivrerBrute extends Omit<
  CommandeALivrer,
  'joursAvantDelai' | 'joursPasses'
> {
  heuresPointees: number;
}

/** Pointage de congé (CP) ou de férié (FERIE) d'une personne. */
export interface PointageAbsence {
  utilisateurId: string;
  nom: string;
  type: 'CP' | 'FERIE';
  debut: Date;
  fin: Date;
}

export const TABLEAU_DE_BORD = Symbol('TABLEAU_DE_BORD');

/** Lectures du tableau de bord (adaptateur TypeORM). */
export interface TableauDeBordPort {
  /** Contrats non échus au jour donné, de clients actifs. */
  contratsCandidats(jour: string): Promise<ContratCandidat[]>;
  /** Suivi (crédit, débit) des contrats, par identifiant. */
  suivis(
    contratIds: readonly number[],
    heuresParJour: number,
  ): Promise<Map<number, SuiviContrat>>;
  /** Commandes non clôturées dont le délai est au plus tard ce jour-là. */
  commandesALivrer(jusquau: string): Promise<CommandeALivrerBrute[]>;
  /** Pointages CP et FERIE commençant entre deux instants. */
  absences(du: Date, au: Date): Promise<PointageAbsence[]>;
  heuresParJour(): Promise<number>;
}
