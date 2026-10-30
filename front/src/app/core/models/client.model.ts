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
