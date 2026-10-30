/**
 * Colonne SQL `date` lue en requête brute (getRawMany) → « AAAA-MM-JJ ».
 *
 * Le driver mssql renvoie un objet Date à minuit heure locale : on en lit
 * les composantes locales (comme TypeORM pour les entités). toISOString()
 * passerait en UTC et décalerait la date d'un jour (fuseau à l'est de UTC).
 */
export function sqlDateToIso(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}
