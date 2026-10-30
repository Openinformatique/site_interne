import { ContratMouvement } from '../../../../core/models/client.model';

/** YYYY-MM-DD → JJ/MM/AAAA ; « — » si vide. */
export function frDate(iso: string | null | undefined): string {
  return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—';
}

/** Heures avec 2 décimales et virgule : « 35,67 h ». */
export function formatHeures(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} h`;
}

/** Nombre de jours (jusqu'à 3 décimales, virgule) : « 0,375 ». */
export function formatJours(value: number | null): string {
  if (value === null) {
    return '—';
  }
  return String(Math.round(value * 1000) / 1000).replace('.', ',');
}

/** Date du jour au format YYYY-MM-DD (heure locale). */
export function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Initiales des deux premiers mots (raison sociale) ; « + » si vide. */
export function initiales(text: string | null | undefined): string {
  const words = (text ?? '').split(/[\s&.'-]+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase() || '+';
}

/** Ligne affichée du suivi d'un contrat. */
export interface MouvementRow {
  kind: 'Commande' | 'Pointage' | 'Pointages';
  /** Vide pour une ligne « Développement » (regroupement). */
  date: string | null;
  label: string;
  /** « 3 pointages » sur une ligne regroupée. */
  sub: string | null;
  who: string | null;
  credit: number;
  debit: number;
}

/**
 * Présentation détaillée : un mouvement par ligne (ordre reçu : date
 * décroissante).
 */
export function mouvementsDetailles(mouvements: ContratMouvement[]): MouvementRow[] {
  return mouvements.map((mouvement) => ({
    kind: mouvement.type === 'COMMANDE' ? 'Commande' : 'Pointage',
    date: mouvement.date,
    label: mouvement.libelle,
    sub: null,
    who: mouvement.utilisateur,
    credit: mouvement.credit,
    debit: mouvement.debit,
  }));
}

/**
 * Présentation synthétique : les pointages consécutifs (entre deux
 * commandes) forment une seule ligne « Développement », sans date, avec le
 * total des heures et le nombre de pointages.
 */
export function mouvementsSynthetiques(mouvements: ContratMouvement[]): MouvementRow[] {
  const rows: MouvementRow[] = [];
  let count = 0;
  for (const row of mouvementsDetailles(mouvements)) {
    const last = rows[rows.length - 1];
    if (row.kind === 'Pointage' && last?.kind === 'Pointages') {
      last.debit += row.debit;
      count += 1;
      last.sub = `${count} pointages`;
    } else if (row.kind === 'Pointage') {
      count = 1;
      rows.push({ kind: 'Pointages', date: null, label: 'Développement', sub: '1 pointage', who: null, credit: 0, debit: row.debit });
    } else {
      rows.push(row);
    }
  }
  return rows;
}

/** Totaux (heures) d'un ensemble de mouvements. */
export function totaux(mouvements: ContratMouvement[]): { credit: number; debit: number; restant: number } {
  const credit = mouvements.reduce((total, mouvement) => total + mouvement.credit, 0);
  const debit = mouvements.reduce((total, mouvement) => total + mouvement.debit, 0);
  return { credit, debit, restant: credit - debit };
}
