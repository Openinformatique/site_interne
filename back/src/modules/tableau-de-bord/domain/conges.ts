import { jourMetier } from '../../../common/utils/sql-date.util';
import { ajouterJours, ecartJours, estWeekEnd, heureMetier } from './jours';
import type { PointageAbsence } from './tableau-de-bord.port';

/**
 * Congés du tableau de bord, reconstitués à partir des pointages « Congés
 * payés » (CP) et « Férié » (FERIE) de chaque personne.
 */

/** Journée entière, ou demi-journée du matin / de l'après-midi. */
export type Duree = 'JOURNEE' | 'MATIN' | 'APRES_MIDI';

export interface JourDeConge {
  jour: string;
  duree: Duree;
}

/** Congé : jours de CP consécutifs (week-ends et fériés de la personne exceptés). */
export interface Conge {
  utilisateurId: string;
  nom: string;
  debut: JourDeConge;
  fin: JourDeConge;
  /** Durée totale du congé en jours (demi-journée = 0,5). */
  nbJours: number;
  /** Jours de congé compris dans la fenêtre affichée. */
  jours: JourDeConge[];
  /** Fériés de la personne compris dans la fenêtre affichée. */
  feries: string[];
  /** Jours jusqu'au premier jour du congé (négatif : congé en cours). */
  joursAvantDebut: number;
  /** Absent aujourd'hui (jour de congé ce jour-là). */
  absentAujourdhui: boolean;
  /** Reprise : premier jour ouvré après le congé (après-midi si le congé finit le matin). */
  retour: JourDeConge;
}

/** Fin d'un pointage de demi-journée du matin : 13 h au plus tard. */
const FIN_DU_MATIN = 13;

/**
 * Durée d'une journée de congé : moins de la moitié d'une journée plus une
 * heure → demi-journée (matin si le dernier pointage finit à 13 h au plus
 * tard, sinon après-midi) ; au-delà, journée entière.
 */
export function dureeDuJour(
  heures: number,
  derniereFin: Date,
  heuresParJour: number,
): Duree {
  if (heures >= heuresParJour / 2 + 1) {
    return 'JOURNEE';
  }
  return heureMetier(derniereFin) <= FIN_DU_MATIN ? 'MATIN' : 'APRES_MIDI';
}

/**
 * Congés qui touchent la fenêtre [du, au] (jours inclus), triés par premier
 * jour puis par nom. `aujourdhui` situe le congé (en cours, à venir).
 * Les pointages doivent couvrir assez de jours autour de la fenêtre pour que
 * les congés qui la débordent soient complets.
 */
export function congesDeLaFenetre(
  pointages: readonly PointageAbsence[],
  fenetre: { du: string; au: string; aujourdhui: string },
  heuresParJour: number,
): Conge[] {
  const parPersonne = new Map<string, PointageAbsence[]>();
  for (const pointage of pointages) {
    const liste = parPersonne.get(pointage.utilisateurId) ?? [];
    liste.push(pointage);
    parPersonne.set(pointage.utilisateurId, liste);
  }

  const conges: Conge[] = [];
  for (const [utilisateurId, siens] of parPersonne) {
    const nom = siens[0]?.nom ?? '';
    const feries = new Set(
      siens.filter((p) => p.type === 'FERIE').map((p) => jourMetier(p.debut)),
    );
    const chome = (jour: string) => estWeekEnd(jour) || feries.has(jour);

    for (const periode of periodes(joursDeConge(siens, heuresParJour), chome)) {
      // Une période compte au moins un jour.
      const debut = periode[0]!;
      const fin = periode[periode.length - 1]!;
      if (fin.jour < fenetre.du || debut.jour > fenetre.au) {
        continue;
      }
      conges.push({
        utilisateurId,
        nom,
        debut,
        fin,
        nbJours: periode.reduce(
          (total, j) => total + (j.duree === 'JOURNEE' ? 1 : 0.5),
          0,
        ),
        jours: periode.filter(
          (j) => j.jour >= fenetre.du && j.jour <= fenetre.au,
        ),
        feries: [...feries]
          .filter((jour) => jour >= fenetre.du && jour <= fenetre.au)
          .sort(),
        joursAvantDebut: ecartJours(fenetre.aujourdhui, debut.jour),
        absentAujourdhui: periode.some((j) => j.jour === fenetre.aujourdhui),
        retour: retourApres(fin, chome),
      });
    }
  }
  return conges.sort(
    (a, b) =>
      a.debut.jour.localeCompare(b.debut.jour) ||
      a.nom.localeCompare(b.nom, 'fr'),
  );
}

/** Jours de CP d'une personne, triés, avec leur durée. */
function joursDeConge(
  pointages: readonly PointageAbsence[],
  heuresParJour: number,
): JourDeConge[] {
  const parJour = new Map<string, { heures: number; derniereFin: Date }>();
  for (const pointage of pointages.filter((p) => p.type === 'CP')) {
    const jour = jourMetier(pointage.debut);
    const cumul = parJour.get(jour) ?? { heures: 0, derniereFin: pointage.fin };
    cumul.heures +=
      (pointage.fin.getTime() - pointage.debut.getTime()) / 3_600_000;
    if (pointage.fin > cumul.derniereFin) {
      cumul.derniereFin = pointage.fin;
    }
    parJour.set(jour, cumul);
  }
  return [...parJour.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([jour, { heures, derniereFin }]) => ({
      jour,
      duree: dureeDuJour(heures, derniereFin, heuresParJour),
    }));
}

/**
 * Regroupe les jours de congé en périodes : deux jours se suivent si seuls
 * des jours chômés les séparent, et si le premier ne s'arrête pas le matin
 * ni le second ne commence l'après-midi (la personne a travaillé entre-temps).
 */
function periodes(
  jours: readonly JourDeConge[],
  chome: (jour: string) => boolean,
): JourDeConge[][] {
  const resultat: JourDeConge[][] = [];
  for (const jour of jours) {
    const courante = resultat[resultat.length - 1];
    const precedent = courante?.[courante.length - 1];
    if (
      precedent &&
      precedent.duree !== 'MATIN' &&
      jour.duree !== 'APRES_MIDI' &&
      seulementChomesEntre(precedent.jour, jour.jour, chome)
    ) {
      courante.push(jour);
    } else {
      resultat.push([jour]);
    }
  }
  return resultat;
}

function seulementChomesEntre(
  de: string,
  a: string,
  chome: (jour: string) => boolean,
): boolean {
  for (let jour = ajouterJours(de, 1); jour < a; jour = ajouterJours(jour, 1)) {
    if (!chome(jour)) {
      return false;
    }
  }
  return true;
}

function retourApres(
  fin: JourDeConge,
  chome: (jour: string) => boolean,
): JourDeConge {
  if (fin.duree === 'MATIN') {
    return { jour: fin.jour, duree: 'APRES_MIDI' };
  }
  let jour = ajouterJours(fin.jour, 1);
  while (chome(jour)) {
    jour = ajouterJours(jour, 1);
  }
  return { jour, duree: 'JOURNEE' };
}
