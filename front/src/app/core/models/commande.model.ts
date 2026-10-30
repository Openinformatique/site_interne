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
