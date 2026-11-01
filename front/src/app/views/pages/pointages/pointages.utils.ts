import { Pointage } from '../../../core/models/pointage.model';

/** Types d'action sans client (temps interne, congés, fériés, arrêts) : non facturables par défaut. */
export const TYPES_SANS_CLIENT = ['AUTRE', 'CP', 'FERIE', 'ARRET'];
/** Nature de commande imposée : « commande » (hors contrat) ou « contrat ». */
export const NATURE_COMMANDE: Record<string, 'commande' | 'contrat'> = { DEVIS: 'commande', ASSC: 'contrat', ASST: 'contrat' };

export const JOURS_COURTS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];
export const JOURS_LONGS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
export const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * La description enregistrée commence par les tags entre crochets :
 * « [Tag 1] [Tag 2] texte ». Renvoie les tags et le texte restant.
 */
export function splitTags(description: string | null): { tags: string[]; texte: string } {
  const tags: string[] = [];
  let texte = description ?? '';
  let match: RegExpExecArray | null;
  while ((match = /^\s*\[([^\]]*)\]/.exec(texte))) {
    const tag = match[1].trim();
    if (tag) {
      tags.push(tag);
    }
    texte = texte.slice(match[0].length);
  }
  return { tags, texte: texte.trim() };
}

export function joinTags(tags: string[], texte: string): string {
  return [...tags.map((tag) => `[${tag}]`), texte.trim()].filter(Boolean).join(' ');
}

/** Minuscules sans accents ni espaces de bord (comparaison des tags). */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Heures décimales à la française : 1,25 ; 2. */
export function formatHeures(heures: number): string {
  return String(Math.round(heures * 100) / 100).replace('.', ',');
}

export function dureeHeures(debut: Date, fin: Date): number {
  return (fin.getTime() - debut.getTime()) / 3_600_000;
}

/** « 08:30 » (heure locale). */
export function hm(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** « 2026-10-27 » (date locale). */
export function isoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Date locale + « HH:MM » → instant ; « 00:00 » en fin de créneau = minuit suivant. */
export function toInstant(date: string, heure: string, finDeCreneau = false): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const time = /^(\d{2}):(\d{2})/.exec(heure);
  if (!match || !time) {
    return null;
  }
  const result = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(time[1]), Number(time[2]));
  if (finDeCreneau && time[1] === '00' && time[2] === '00') {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

/** Lundi 00:00 (heure locale) de la semaine qui contient la date. */
export function lundiDe(date: Date): Date {
  const lundi = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7));
  return lundi;
}

/** Numéro de semaine ISO 8601. */
export function numeroSemaine(date: Date): number {
  const jeudi = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  jeudi.setUTCDate(jeudi.getUTCDate() + 3 - ((jeudi.getUTCDay() + 6) % 7));
  const premierJeudi = new Date(Date.UTC(jeudi.getUTCFullYear(), 0, 4));
  return 1 + Math.round((jeudi.getTime() - premierJeudi.getTime()) / 86_400_000 / 7 - 3 / 7 + ((premierJeudi.getUTCDay() + 6) % 7) / 7);
}

/** « du 26 au 30 octobre 2026 », « du 28 septembre au 2 octobre 2026 ». */
export function libellePeriode(premier: Date, dernier: Date): string {
  const moisPremier = premier.getMonth() !== dernier.getMonth() ? ` ${MOIS[premier.getMonth()]}` : '';
  const anneePremier = premier.getFullYear() !== dernier.getFullYear() ? ` ${premier.getFullYear()}` : '';
  return `du ${premier.getDate()}${moisPremier}${anneePremier} au ${dernier.getDate()} ${MOIS[dernier.getMonth()]} ${dernier.getFullYear()}`;
}

/** Titre d'un bloc : « [ CORAIL ] CARGO RAIL ( 2 h ) », « INTERNE ( 1,5 h ) ». */
export function titrePointage(pointage: Pick<Pointage, 'clientId' | 'clientCode' | 'clientNom' | 'commandeNumero'>, heures: number): string {
  const client = pointage.clientId === null ? 'INTERNE' : (pointage.clientCode || pointage.clientNom || 'CLIENT');
  const commande = pointage.commandeNumero ? `[ ${pointage.commandeNumero} ] ` : '';
  return `${commande}${client} ( ${formatHeures(heures)} h )`;
}

/** « 255,153,153 » → « rgb(255,153,153) » ; gris par défaut. */
export function couleurType(couleur: string | null | undefined): string {
  return couleur && /^\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*$/.test(couleur) ? `rgb(${couleur.replace(/\s/g, '')})` : 'rgb(121,135,161)';
}
