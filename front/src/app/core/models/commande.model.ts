/** Colonnes de tri de la liste des commandes (liste blanche du back). */
export type CommandeSortField =
  | 'client'
  | 'groupe'
  | 'dateCommande'
  | 'numeroCommande'
  | 'numeroDevis'
  | 'dateDevis'
  | 'delai'
  | 'libelle'
  | 'joursPrevus'
  | 'joursPasses'
  | 'joursCommandes'
  | 'montant'
  | 'statut';

/** Ligne de la liste des commandes (GET /commandes). Dates en AAAA-MM-JJ. */
export interface CommandeListItem {
  id: number;
  clientId: number;
  codeClient: string | null;
  client: string | null;
  /** Clé GSOC. */
  groupe: string | null;
  groupeLibelle: string | null;
  dateCommande: string | null;
  numeroCommande: string | null;
  numeroDevis: string | null;
  dateDevis: string | null;
  delai: string | null;
  libelle: string | null;
  joursPrevus: number | null;
  /** Heures facturables pointées ÷ heures par jour. */
  joursPasses: number;
  joursCommandes: number | null;
  montant: number | null;
  dateCloture: string | null;
}

/** Client du filtre « Client » (clients ayant au moins une commande). */
export interface CommandeClientOption {
  id: number;
  codeClient: string | null;
  raisonSociale: string | null;
}

/** Champs saisis sur la fiche commande (POST / PUT /commandes). */
export interface CommandeInput {
  clientId: number;
  clientContratId: number | null;
  /** Clé TYPC. */
  typeCommande: string;
  numeroDevis: string | null;
  dateDevis: string;
  numeroCommandeClient: string | null;
  dateCommande: string;
  libelleCommande: string;
  nbJoursCommande: number;
  nbJoursPrevus: number;
  delai: string | null;
  montant: number | null;
  dateCloture: string | null;
}

/** Fiche commande (GET /commandes/:id). */
export interface CommandeDetail extends CommandeInput {
  id: number;
  /** Raison sociale du client. */
  client: string | null;
  clientActif: boolean;
  /** Des pointages sont rattachés : le client n'est plus modifiable. */
  hasPointages: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

/** Jours facturables pointés par une personne. */
export interface TempsPersonne {
  utilisateurId: string | null;
  personne: string | null;
  jours: number;
  dernierPointage: string | null;
}

export interface PointageCommande {
  id: number;
  date: string | null;
  personne: string | null;
  typeAction: string | null;
  typeActionLibelle: string | null;
  description: string | null;
  jours: number;
}

/** Temps passé (GET /commandes/:id/temps). */
export interface CommandeTemps {
  personnes: TempsPersonne[];
  pointages: PointageCommande[];
}

/** Document joint (GET /commandes/:id/documents). */
export interface CommandeDocument {
  id: number;
  nomFichier: string | null;
  /** Clé TDOC. */
  typeDocument: string | null;
  typeDocumentLibelle: string | null;
  commentaire: string | null;
  typeMime: string;
  tailleOctets: number;
  createdAt: string;
}
