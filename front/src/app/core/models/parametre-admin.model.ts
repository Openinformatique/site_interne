/** Rubrique (colonne) d'une table de paramètres, numérotée « 01 », « 02 »… */
export interface Rubrique {
  num: string;
  nom: string;
  aide: string;
  /** Nombre de valeurs renseignées (effacées si la rubrique est supprimée). */
  nbValeurs: number;
}

/** Table de paramètres (GET /parametres/admin/tables). */
export interface TableParametres {
  code: string;
  nom: string;
  nomCle: string;
  tailleCle: number;
  aide: string;
  /** Afficher la clé devant le libellé dans les listes. */
  codeDansCombo: boolean;
  rubriques: Rubrique[];
  nbParametres: number;
}

/** Rubrique saisie : `ancienNum` = rubrique existante, null pour une nouvelle. */
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

/** Paramètre : clé, statut et valeurs par numéro de rubrique. */
export interface Parametre {
  cle: string;
  actif: boolean;
  valeurs: Record<string, string>;
}
