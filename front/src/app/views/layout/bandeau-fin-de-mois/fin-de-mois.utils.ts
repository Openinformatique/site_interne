/** Dernier jour ouvré du mois : dernier jour du lundi au vendredi (fériés non exclus). */
export function estDernierJourOuvre(date: Date): boolean {
  if (estWeekEnd(date)) {
    return false;
  }
  const suivant = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  while (suivant.getMonth() === date.getMonth()) {
    if (!estWeekEnd(suivant)) {
      return false;
    }
    suivant.setDate(suivant.getDate() + 1);
  }
  return true;
}

/** « octobre », « décembre ». */
export function nomDuMois(date: Date): string {
  return date.toLocaleDateString('fr-FR', { month: 'long' });
}

/** « d'octobre », « de décembre ». */
export function duMois(date: Date): string {
  const nom = nomDuMois(date);
  return /^[aeiouyàâéèêîôû]/i.test(nom) ? `d'${nom}` : `de ${nom}`;
}

/** AAAA-MM-JJ (heure locale) → date locale ; null si le texte n'est pas une date. */
export function dateLocale(iso: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

function estWeekEnd(date: Date): boolean {
  return date.getDay() === 0 || date.getDay() === 6;
}
