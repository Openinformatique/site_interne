import { jourMetier } from '../../../common/utils/sql-date.util';

/**
 * Alertes « pointages incomplets » (cloche de la barre du haut) : jours
 * ouvrés (lundi à vendredi) des 14 jours précédant aujourd'hui où la
 * personne a pointé moins de 7 h. Tous les pointages comptent, absences
 * comprises ; un férié non pointé déclenche l'alerte.
 */

/** Heures attendues par jour ouvré. */
export const HEURES_ATTENDUES = 7;
/** Jours calendaires examinés avant aujourd'hui (aujourd'hui exclu). */
export const JOURS_EXAMINES = 14;

export interface JourIncomplet {
  /** « AAAA-MM-JJ ». */
  jour: string;
  /** Heures pointées ce jour-là (à Paris). */
  heures: number;
  manquantes: number;
  /** Jours écoulés depuis ce jour (1 = hier). */
  joursEcoules: number;
}

/** Jours incomplets, du plus récent au plus ancien. */
export function joursIncomplets(
  pointages: readonly { debut: Date; fin: Date }[],
  aujourdhui: string,
): JourIncomplet[] {
  const heuresParJour = new Map<string, number>();
  for (const pointage of pointages) {
    const jour = jourMetier(pointage.debut);
    const heures =
      (pointage.fin.getTime() - pointage.debut.getTime()) / 3_600_000;
    heuresParJour.set(jour, (heuresParJour.get(jour) ?? 0) + heures);
  }

  const resultat: JourIncomplet[] = [];
  for (let ecart = 1; ecart <= JOURS_EXAMINES; ecart++) {
    const jour = jourAvant(aujourdhui, ecart);
    if (estWeekEnd(jour)) {
      continue;
    }
    const heures = arrondi(heuresParJour.get(jour) ?? 0);
    if (heures < HEURES_ATTENDUES) {
      resultat.push({
        jour,
        heures,
        manquantes: arrondi(HEURES_ATTENDUES - heures),
        joursEcoules: ecart,
      });
    }
  }
  return resultat;
}

function jourAvant(jour: string, nombre: number): string {
  const date = new Date(`${jour}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - nombre);
  return date.toISOString().slice(0, 10);
}

function estWeekEnd(jour: string): boolean {
  const jourSemaine = new Date(`${jour}T00:00:00Z`).getUTCDay();
  return jourSemaine === 0 || jourSemaine === 6;
}

function arrondi(value: number): number {
  return Math.round(value * 100) / 100;
}
