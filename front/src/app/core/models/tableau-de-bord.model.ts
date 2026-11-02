/** Modèles du tableau de bord (voir back/src/modules/tableau-de-bord/README.md). */

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

export interface CommandeALivrer {
  id: number;
  clientId: number;
  codeClient: string | null;
  raisonSociale: string | null;
  libelle: string | null;
  numeroCommande: string | null;
  numeroDevis: string | null;
  delai: string;
  /** Négatif = retard, 0 = aujourd'hui. */
  joursAvantDelai: number;
  joursCommandes: number | null;
  joursPasses: number;
}

export type DureeConge = 'JOURNEE' | 'MATIN' | 'APRES_MIDI';

export interface JourDeConge {
  jour: string;
  duree: DureeConge;
}

export interface Conge {
  utilisateurId: string;
  nom: string;
  debut: JourDeConge;
  fin: JourDeConge;
  /** Durée totale du congé (demi-journée = 0,5). */
  nbJours: number;
  /** Jours de congé dans la fenêtre. */
  jours: JourDeConge[];
  /** Fériés pointés par la personne dans la fenêtre. */
  feries: string[];
  /** Négatif : congé en cours. */
  joursAvantDebut: number;
  absentAujourdhui: boolean;
  retour: JourDeConge;
}

export interface CongesDuTableau {
  du: string;
  au: string;
  aujourdhui: string;
  conges: Conge[];
}
