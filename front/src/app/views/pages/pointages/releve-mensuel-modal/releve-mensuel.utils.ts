import { Pointage } from '../../../../core/models/pointage.model';
import { formatHeures, MOIS } from '../pointages.utils';

/** Nombre de mois proposés, mois en cours compris. */
export const NB_MOIS = 24;

export interface MoisOption {
  /** « AAAA-MM » (mois de 1 à 12). */
  cle: string;
  annee: number;
  mois: number;
  libelle: string;
}

/** Les NB_MOIS derniers mois, du plus récent (mois en cours) au plus ancien. */
export function moisProposes(aujourdhui: Date): MoisOption[] {
  return Array.from({ length: NB_MOIS }, (_, i) => {
    const date = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - i, 1);
    const annee = date.getFullYear();
    const mois = date.getMonth() + 1;
    return {
      cle: `${annee}-${String(mois).padStart(2, '0')}`,
      annee,
      mois,
      libelle: `${capitalize(MOIS[mois - 1])} ${annee}`,
    };
  });
}

/** Bornes [du, au[ du mois (1 à 12), en heure locale. */
export function bornesMois(annee: number, mois: number): { du: Date; au: Date } {
  return { du: new Date(annee, mois - 1, 1), au: new Date(annee, mois, 1) };
}

/**
 * Récapitulatif de la modale, sur les pointages commençant dans le mois
 * (même règle que le relevé) : « 176 h pointées en septembre 2026 ·
 * 11 clients · 145 pointages ».
 */
export function recapitulatif(pointages: Pointage[], annee: number, mois: number): { vide: boolean; texte: string } {
  const { du, au } = bornesMois(annee, mois);
  const retenus = pointages.filter((pointage) => {
    const debut = new Date(pointage.debut);
    return debut >= du && debut < au;
  });
  const periode = `${MOIS[mois - 1]} ${annee}`;
  if (retenus.length === 0) {
    return { vide: true, texte: `Aucun pointage en ${periode}.` };
  }
  const heures = retenus.reduce((total, p) => total + (new Date(p.fin).getTime() - new Date(p.debut).getTime()) / 3_600_000, 0);
  const clients = new Set(retenus.filter((p) => p.clientId !== null).map((p) => p.clientId)).size;
  const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;
  return {
    vide: false,
    texte: `${formatHeures(heures)} h pointées en ${periode} · ${pluriel(clients, 'client')} · ${pluriel(retenus.length, 'pointage')}`,
  };
}

function capitalize(texte: string): string {
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}
