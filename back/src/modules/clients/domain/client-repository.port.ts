import { SortDirection } from '../../../common/pagination/sort-direction.enum';

/** Client tel qu'affiché dans la liste des clients (lecture seule). */
export interface ClientSummary {
  id: number;
  codeClient: string | null;
  raisonSociale: string | null;
  /** Clé de paramètre GSOC ; null si le client n'a pas de groupe. */
  groupe: string | null;
  actif: boolean;
  adresse1: string | null;
  adresse2: string | null;
  adresse3: string | null;
  codePostal: string | null;
  ville: string | null;
  /** Clé de paramètre PAYS (ex. FR). */
  codePays: string | null;
}

/** Colonnes de tri autorisées pour la liste des clients. */
export const CLIENT_SORT_FIELDS = [
  'codeClient',
  'raisonSociale',
  'groupe',
  'actif',
  'adresse1',
  'adresse2',
  'adresse3',
  'codePostal',
  'ville',
  'codePays',
] as const;
export type ClientSortField = (typeof CLIENT_SORT_FIELDS)[number];

export interface ListClientsQuery {
  page: number;
  limit: number;
  sortBy: ClientSortField;
  sortDirection: SortDirection;
  /**
   * Recherche multi-mots : chaque mot doit figurer (insensible à la casse
   * et aux accents) dans le code, la raison sociale, les adresses, le code
   * postal, la ville, le pays (code ou libellé), le n° de TVA ou le groupe.
   */
  search?: string;
  /** false (défaut) : clients actifs uniquement. */
  includeInactive: boolean;
  /**
   * Groupes retenus (clés GSOC). Combinés en OU avec `sansGroupe` ; aucun
   * des deux renseigné = pas de filtre sur le groupe.
   */
  groupes: string[];
  /** Inclut les clients sans groupe. */
  sansGroupe: boolean;
}

export interface ClientsPage {
  items: ClientSummary[];
  totalItems: number;
}

export interface ClientRepositoryPort {
  /** Liste paginée, triée et filtrée (clients supprimés toujours exclus). */
  findPage(query: ListClientsQuery): Promise<ClientsPage>;
}

/** Jeton d'injection du repository des clients. */
export const CLIENT_REPOSITORY = Symbol('CLIENT_REPOSITORY');
