import { FUSEAU_METIER } from '../../../common/utils/sql-date.util';

/** Calcul sur des jours calendaires « AAAA-MM-JJ » (sans fuseau). */

export function ajouterJours(jour: string, nombre: number): string {
  const date = new Date(`${jour}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + nombre);
  return date.toISOString().slice(0, 10);
}

/** Nombre de jours de `de` à `a` (négatif si `a` est avant `de`). */
export function ecartJours(de: string, a: string): number {
  return Math.round(
    (Date.parse(`${a}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000,
  );
}

export function estWeekEnd(jour: string): boolean {
  const jourSemaine = new Date(`${jour}T00:00:00Z`).getUTCDay();
  return jourSemaine === 0 || jourSemaine === 6;
}

/** Heure décimale d'un instant dans le fuseau métier (13 h 30 → 13.5). */
export function heureMetier(instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: FUSEAU_METIER,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const part = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return part('hour') + part('minute') / 60;
}
