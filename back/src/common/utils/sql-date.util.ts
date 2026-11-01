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

/**
 * Instants UTC stockés en `datetime2` (ex. `pointages.date_heure_debut`).
 *
 * Le pilote mssql de TypeORM lit et écrit les `datetime2` en heure locale du
 * serveur Node (useUTC: false) : ces colonnes passent donc par du texte UTC
 * explicite, en lecture (sqlUtcText + utcTextToDate) comme en écriture
 * (dateToUtcText + `CAST(:param AS datetime2)`).
 */

/** Fuseau des utilisateurs : sert à situer un instant dans un jour calendaire. */
export const FUSEAU_METIER = 'Europe/Paris';

/** Expression SQL : colonne datetime2 UTC lue en texte ISO sans fuseau. */
export function sqlUtcText(column: string): string {
  return `CONVERT(varchar(23), ${column}, 126)`;
}

/** Texte ISO sans fuseau (CONVERT style 126) → instant UTC. */
export function utcTextToDate(text: string): Date {
  return new Date(`${text}Z`);
}

/** Instant → texte UTC « AAAA-MM-JJ hh:mm:ss.SSS » pour `CAST(… AS datetime2)`. */
export function dateToUtcText(date: Date): string {
  return date.toISOString().slice(0, 23).replace('T', ' ');
}

/** Jour calendaire « AAAA-MM-JJ » d'un instant, dans le fuseau métier. */
export function jourMetier(instant: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSEAU_METIER,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
