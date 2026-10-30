/** Valeur d'une table de paramètres : une clé et son libellé (rubrique 01). */
export interface ParametreValue {
  cle: string;
  libelle: string;
}

export interface ParametreRepositoryPort {
  /**
   * Valeurs actives d'une table de paramètres (rubrique 01 = libellé),
   * triées par libellé. Tableau vide si la table est inconnue.
   */
  findValues(codeTable: string): Promise<ParametreValue[]>;
}

/** Jeton d'injection du repository des paramètres. */
export const PARAMETRE_REPOSITORY = Symbol('PARAMETRE_REPOSITORY');
