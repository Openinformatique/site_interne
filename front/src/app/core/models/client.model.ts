/** Ligne de la liste des clients (miroir de ClientSummaryResponseDto du back). */
export interface ClientSummary {
  id: number;
  codeClient: string | null;
  raisonSociale: string | null;
  /** Clé du paramètre GSOC (groupe sociétal) ; null si aucun groupe. */
  groupe: string | null;
  actif: boolean;
  adresse1: string | null;
  adresse2: string | null;
  adresse3: string | null;
  codePostal: string | null;
  ville: string | null;
  /** Clé du paramètre PAYS (ex. FR). */
  codePays: string | null;
}

/** Colonnes de tri acceptées par GET /clients. */
export type ClientSortField =
  | 'codeClient'
  | 'raisonSociale'
  | 'groupe'
  | 'actif'
  | 'adresse1'
  | 'adresse2'
  | 'adresse3'
  | 'codePostal'
  | 'ville'
  | 'codePays';

/** Valeur d'une table de paramètres (GET /parametres/:codeTable). */
export interface ParametreValue {
  cle: string;
  libelle: string;
}

/** Champs saisissables d'un client (corps de POST /clients et PUT /clients/:id). */
export interface ClientInput {
  codeClient: string;
  raisonSociale: string;
  actif: boolean;
  adresse1: string | null;
  adresse2: string | null;
  adresse3: string | null;
  codePostal: string;
  ville: string;
  /** Clé PAYS. */
  codePays: string;
  /** Clé GSOC. */
  groupe: string | null;
  numeroTva: string | null;
  /** Clé REGL. */
  modeReglement: string | null;
}

/** Fiche client (miroir de ClientDetailResponseDto du back). */
export interface ClientDetail extends Omit<ClientInput, 'codeClient' | 'raisonSociale' | 'codePostal' | 'ville' | 'codePays'> {
  id: number;
  codeClient: string | null;
  raisonSociale: string | null;
  codePostal: string | null;
  ville: string | null;
  codePays: string | null;
  createdAt: string;
  updatedAt: string;
  /** Nom de l'auteur ; null pour les données reprises de l'ancienne application. */
  createdBy: string | null;
  updatedBy: string | null;
}

export interface ContratInput {
  libelleContrat: string;
  /** YYYY-MM-DD. */
  dateMiseEnPlace: string;
  dateEcheance: string | null;
}

/** Contrat avec son suivi en heures. */
export interface Contrat {
  id: number;
  libelleContrat: string | null;
  dateMiseEnPlace: string | null;
  dateEcheance: string | null;
  credit: number;
  debit: number;
  restant: number;
}

/** Mouvement du suivi d'un contrat : commande (crédit) ou pointage (débit), en heures. */
export interface ContratMouvement {
  type: 'COMMANDE' | 'POINTAGE';
  date: string | null;
  libelle: string;
  /** Login du salarié (pointage). */
  utilisateur: string | null;
  credit: number;
  debit: number;
}

export interface ContactInput {
  /** 1 = M., 2 = Mme. */
  civilite: number;
  nom: string;
  prenom: string | null;
  /** Libellé FONC. */
  poste: string;
  telephone: string | null;
  adresseEmail: string | null;
  actif: boolean;
}

export interface Contact extends Omit<ContactInput, 'civilite'> {
  id: number;
  /** 1 = M., 2 = Mme, 0 = non renseignée. */
  civilite: number;
}

/** Commande affichée dans la fiche client. */
export interface ClientCommande {
  id: number;
  numeroCommande: string | null;
  numeroDevis: string | null;
  dateDevis: string | null;
  dateCommande: string | null;
  /** Clé TYPC. */
  typeCommande: string | null;
  contrat: string | null;
  delai: string | null;
  joursPrevus: number | null;
  joursPasses: number;
  libelle: string | null;
  dateCloture: string | null;
}

export interface ClientCommandesQuery {
  includeClosed: boolean;
  du?: string;
  au?: string;
}
