/** Transformations communes aux DTO d'écriture de la fiche client. */

/** Chaîne : espaces de bord retirés ; chaîne vide → null. */
export const trimToNull = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/** Chaîne obligatoire : espaces de bord retirés (vide reste vide). */
export const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Query string : "true" / "false" convertis en booléens. */
export const toBoolean = ({ value }: { value: unknown }): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

export const REQUIRED = 'Champ obligatoire.';

export const tooLong = (max: number) => ({
  message: `${max} caractères maximum.`,
});

export const INVALID_DATE = 'Date invalide (AAAA-MM-JJ).';
