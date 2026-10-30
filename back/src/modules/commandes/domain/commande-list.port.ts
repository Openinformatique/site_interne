import { SortDirection } from '../../../common/pagination/sort-direction.enum';

/** Commande telle qu'affichée dans la liste des commandes (lecture seule). */
export interface CommandeListItem {
  id: number;
  clientId: number;
  codeClient: string | null;
  client: string | null;
  /** Clé de paramètre GSOC ; null si le client n'a pas de groupe. */
  groupe: string | null;
  /** Libellé GSOC du groupe (repli sur la clé). */
  groupeLibelle: string | null;
  dateCommande: string | null;
  numeroCommande: string | null;
  numeroDevis: string | null;
  dateDevis: string | null;
  delai: string | null;
  libelle: string | null;
  joursPrevus: number | null;
  /** Heures facturables pointées ÷ heures par jour (TDIV/HJOUR). */
  joursPasses: number;
  joursCommandes: number | null;
  montant: number | null;
  dateCloture: string | null;
}

/** Colonnes de tri autorisées pour la liste des commandes. */
export const COMMANDE_SORT_FIELDS = [
  'client',
  'groupe',
  'dateCommande',
  'numeroCommande',
  'numeroDevis',
  'dateDevis',
  'delai',
  'libelle',
  'joursPrevus',
  'joursPasses',
  'joursCommandes',
  'montant',
  'statut',
] as const;
export type CommandeSortField = (typeof COMMANDE_SORT_FIELDS)[number];

/** Filtres et tri communs à la liste et à l'export Excel. */
export interface CommandesFilter {
  sortBy: CommandeSortField;
  sortDirection: SortDirection;
  /**
   * Recherche multi-mots : chaque mot doit figurer (insensible à la casse
   * et aux accents) dans le n° de commande, le n° de devis, le libellé, le
   * client (code, raison sociale), le libellé du contrat ou le montant.
   */
  search?: string;
  /** false (défaut) : commandes en cours uniquement. */
  includeClosed: boolean;
  /** Période : date du devis OU date de commande comprise entre du et au. */
  du?: string;
  au?: string;
  clientId?: number;
  /** Groupes retenus (clés GSOC), combinés en OU avec `sansGroupe`. */
  groupes: string[];
  sansGroupe: boolean;
}

export interface ListCommandesQuery extends CommandesFilter {
  page: number;
  limit: number;
}

export interface CommandesPage {
  items: CommandeListItem[];
  totalItems: number;
}

/** Client proposé dans le filtre « Client » (clients ayant des commandes). */
export interface CommandeClientOption {
  id: number;
  codeClient: string | null;
  raisonSociale: string | null;
}

export interface CommandeListPort {
  findPage(
    query: ListCommandesQuery,
    heuresParJour: number,
  ): Promise<CommandesPage>;
  /** Toutes les commandes du filtre (export), dans l'ordre du tri. */
  findAll(
    filter: CommandesFilter,
    heuresParJour: number,
  ): Promise<CommandeListItem[]>;
  listClients(): Promise<CommandeClientOption[]>;
  /** Heures d'une journée (paramètre TDIV/HJOUR, 8 par défaut). */
  heuresParJour(): Promise<number>;
}

/** Jeton d'injection du repository de la liste des commandes. */
export const COMMANDE_LIST = Symbol('COMMANDE_LIST');

/** Génération du classeur Excel de l'export de la liste. */
export interface CommandesSpreadsheetPort {
  build(commandes: CommandeListItem[]): Promise<Buffer>;
}

export const COMMANDES_SPREADSHEET = Symbol('COMMANDES_SPREADSHEET');
