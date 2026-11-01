/** Rubrique (colonne) d'une table de paramètres, numérotée « 01 », « 02 »… */
export interface Rubrique {
  num: string;
  nom: string;
  aide: string;
}

/** Table de paramètres avec ses rubriques (écran Paramètres). */
export interface TableParametres {
  code: string;
  nom: string;
  nomCle: string;
  tailleCle: number;
  aide: string;
  /** Afficher la clé devant le libellé dans les listes. */
  codeDansCombo: boolean;
  rubriques: (Rubrique & { nbValeurs: number })[];
  nbParametres: number;
}

/**
 * Rubrique saisie : `ancienNum` = numéro de la rubrique existante qu'elle
 * remplace (null pour une nouvelle). Les rubriques sont renumérotées dans
 * l'ordre reçu.
 */
export interface RubriqueInput {
  ancienNum: string | null;
  nom: string;
  aide: string;
}

export interface TableInput {
  nom: string;
  nomCle: string;
  tailleCle: number;
  aide: string;
  codeDansCombo: boolean;
  rubriques: RubriqueInput[];
}

/** Paramètre : une clé et ses valeurs par rubrique (« 01 » → libellé…). */
export interface Parametre {
  cle: string;
  actif: boolean;
  valeurs: Record<string, string>;
}

/** Mise à jour des rubriques d'une table : renumérotation et suppressions. */
export interface RubriquesChange {
  rubriques: Rubrique[];
  /** Ancien numéro → nouveau numéro des rubriques conservées. */
  renumerotation: Record<string, string>;
  /** Numéros des rubriques supprimées (valeurs effacées). */
  supprimees: string[];
}

export interface ParametreAdminPort {
  listTables(): Promise<TableParametres[]>;
  findTable(code: string): Promise<TableParametres | null>;
  createTable(
    code: string,
    input: TableInput,
    rubriques: Rubrique[],
    userId: string,
  ): Promise<void>;
  updateTable(
    code: string,
    input: TableInput,
    change: RubriquesChange,
    userId: string,
  ): Promise<void>;
  /** Supprime la table et ses rubriques (la table ne contient aucun paramètre). */
  deleteTable(code: string): Promise<void>;
  /** Plus grande longueur de clé de la table (0 si vide). */
  longueurMaxCle(code: string): Promise<number>;

  listParametres(code: string): Promise<Parametre[]>;
  findParametre(code: string, cle: string): Promise<Parametre | null>;
  /** Écrit les valeurs (une ligne par rubrique renseignée ; vide = supprimée). */
  saveParametre(
    code: string,
    parametre: Parametre,
    userId: string,
  ): Promise<void>;
  deleteParametre(code: string, cle: string): Promise<void>;
  /** Nombre d'enregistrements de l'application qui utilisent la clé. */
  countUtilisations(
    code: string,
    cle: string,
    libelle: string,
  ): Promise<number>;
}

/** Jeton d'injection du repository d'administration du paramétrage. */
export const PARAMETRE_ADMIN = Symbol('PARAMETRE_ADMIN');
