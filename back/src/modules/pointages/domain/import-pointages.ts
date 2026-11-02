import { FUSEAU_METIER } from '../../../common/utils/sql-date.util';

/**
 * Import de pointages depuis un classeur Excel (écran Pointages) : format du
 * fichier, lecture des cellules et placement des pointages dans la journée.
 * Les références (client, type, commande, contact) sont résolues par le cas
 * d'utilisation.
 */

/** Colonnes attendues, dans l'ordre (en-têtes de la ligne 1). */
export const COLONNES_IMPORT = [
  { lettre: 'A', entete: 'Client' },
  { lettre: 'B', entete: 'Type de tâche' },
  { lettre: 'C', entete: 'Thème' },
  { lettre: 'D', entete: 'Devis' },
  { lettre: 'E', entete: 'Date' },
  { lettre: 'F', entete: 'Durée' },
  { lettre: 'G', entete: 'Observations' },
  { lettre: 'H', entete: 'Contact' },
] as const;

export type LettreColonne = (typeof COLONNES_IMPORT)[number]['lettre'];

/** Premier pointage de chaque jour : 7 h (heure de Paris). */
export const HEURE_DEBUT_JOURNEE = 7;
/** Nombre maximal de lignes de pointage lues. */
export const LIGNES_MAX = 2000;

/** Valeur d'une cellule telle que lue dans le classeur. */
export type Cellule = string | number | Date | null;

export interface LigneBrute {
  /** Numéro de ligne Excel (2 = premier pointage). */
  numero: number;
  /** Cellules A à H. */
  cellules: Cellule[];
}

export interface ControleColonne {
  lettre: string;
  attendu: string;
  lu: string | null;
  conforme: boolean;
}

export interface ControleFormat {
  conforme: boolean;
  colonnes: ControleColonne[];
}

export interface ErreurImport {
  /** Ligne Excel ; null pour une erreur qui concerne tout le fichier. */
  ligne: number | null;
  /** « D – Devis » ; null pour une erreur qui concerne toute la ligne. */
  colonne: string | null;
  valeur: string | null;
  message: string;
}

/** Ligne lue, avant résolution des références. */
export interface LigneLue {
  numero: number;
  client: string | null;
  type: string;
  tags: string[];
  commande: string | null;
  /** AAAA-MM-JJ ; null si la date est invalide. */
  jour: string | null;
  /** null si la durée est invalide. */
  heures: number | null;
  description: string;
  contact: string | null;
}

/** Minuscules, sans accents, espaces réduits : comparaison des en-têtes et des libellés. */
export function normaliser(texte: string | null | undefined): string {
  return (texte ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function libelleColonne(lettre: LettreColonne): string {
  const colonne = COLONNES_IMPORT.find((c) => c.lettre === lettre)!;
  return `${colonne.lettre} – ${colonne.entete}`;
}

/**
 * En-têtes de la ligne 1 : les 8 colonnes attendues, dans l'ordre (casse,
 * accents et espaces indifférents), et rien au-delà de la colonne H.
 */
export function controlerEntetes(lus: readonly Cellule[]): ControleFormat {
  const colonnes: ControleColonne[] = COLONNES_IMPORT.map((colonne, index) => {
    const lu = texte(lus[index] ?? null) || null;
    return {
      lettre: colonne.lettre,
      attendu: colonne.entete,
      lu,
      conforme: normaliser(lu) === normaliser(colonne.entete),
    };
  });
  lus.slice(COLONNES_IMPORT.length).forEach((cellule, index) => {
    const lu = texte(cellule);
    if (lu) {
      colonnes.push({
        lettre: String.fromCharCode(73 + index), // I, J…
        attendu: '',
        lu,
        conforme: false,
      });
    }
  });
  return { conforme: colonnes.every((c) => c.conforme), colonnes };
}

/** Ligne entièrement vide (ignorée). */
export function ligneVide(ligne: LigneBrute): boolean {
  return ligne.cellules.every((cellule) => texte(cellule) === '');
}

/** Lecture des cellules d'une ligne ; erreurs de forme (type, date, durée). */
export function lireLigne(ligne: LigneBrute): {
  ligne: LigneLue;
  erreurs: ErreurImport[];
} {
  const cellule = (index: number): Cellule => ligne.cellules[index] ?? null;
  const [a, b, c, d, e, f, g, h] = [0, 1, 2, 3, 4, 5, 6, 7].map(cellule) as [
    Cellule,
    Cellule,
    Cellule,
    Cellule,
    Cellule,
    Cellule,
    Cellule,
    Cellule,
  ];
  const erreurs: ErreurImport[] = [];
  const erreur = (lettre: LettreColonne, cellule: Cellule, message: string) =>
    erreurs.push({
      ligne: ligne.numero,
      colonne: libelleColonne(lettre),
      valeur: texte(cellule) || null,
      message,
    });

  const type = texte(b).toUpperCase();
  if (!type) {
    erreur('B', b, 'Type de pointage obligatoire.');
  }
  const jour = lireJour(e);
  if (jour === null) {
    erreur('E', e, texte(e) ? 'Date invalide.' : 'Date obligatoire.');
  }
  const heures = lireHeures(f);
  if (heures === null) {
    erreur(
      'F',
      f,
      texte(f)
        ? 'Durée invalide (supérieure à 0 et au plus 24 h).'
        : 'Durée obligatoire.',
    );
  }

  return {
    ligne: {
      numero: ligne.numero,
      client: texte(a) || null,
      type,
      tags: texte(c)
        .split(/[;,]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
      commande: texte(d) || null,
      jour,
      heures,
      description: texte(g),
      contact: texte(h) || null,
    },
    erreurs,
  };
}

/**
 * Horaires des lignes (dans l'ordre du fichier) : chaque jour, à partir de
 * 7 h, les pointages se suivent sans chevauchement. Minutes depuis minuit ;
 * null pour une ligne sans date ou durée valide.
 */
export function horaires(
  lignes: readonly Pick<LigneLue, 'jour' | 'heures'>[],
): ({ debut: number; fin: number } | null)[] {
  const prochain = new Map<string, number>();
  return lignes.map(({ jour, heures }) => {
    if (jour === null || heures === null) {
      return null;
    }
    const debut = prochain.get(jour) ?? HEURE_DEBUT_JOURNEE * 60;
    const fin = debut + heures * 60;
    prochain.set(jour, fin);
    return { debut, fin };
  });
}

/** Instant UTC d'une heure (minutes depuis minuit, décimales possibles) d'un jour à Paris. */
export function instantParis(jour: string, minutes: number): Date {
  const minuitUtc = Date.parse(`${jour}T00:00:00Z`);
  const approche = new Date(minuitUtc + minutes * 60_000);
  // Décalage de Paris à cet instant (1 h l'hiver, 2 h l'été).
  const decalage = decalageMinutes(approche);
  const instant = new Date(approche.getTime() - decalage * 60_000);
  // Au changement d'heure, le décalage peut différer de quelques heures.
  const corrige = decalageMinutes(instant);
  return corrige === decalage
    ? instant
    : new Date(approche.getTime() - corrige * 60_000);
}

/** Description avec ses tags en tête, comme la saisie : « [Tag] [Tag 2] texte ». */
export function joinTags(tags: readonly string[], texte: string): string {
  return [...tags.map((tag) => `[${tag}]`), texte.trim()]
    .filter(Boolean)
    .join(' ');
}

/** « 07:00 », « 09:30 » (minutes depuis minuit). */
export function heureMinute(minutes: number): string {
  const total = Math.round(minutes);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** Texte d'une cellule (nombre écrit en décimal, date en JJ/MM/AAAA), sans espaces de bord. */
export function texte(cellule: Cellule): string {
  if (cellule === null) {
    return '';
  }
  if (cellule instanceof Date) {
    return Number.isNaN(cellule.getTime())
      ? ''
      : `${pad2(cellule.getUTCDate())}/${pad2(cellule.getUTCMonth() + 1)}/${cellule.getUTCFullYear()}`;
  }
  return String(cellule).trim();
}

/**
 * Date d'une cellule : date Excel (lue en UTC), numéro de série Excel, ou
 * texte JJ/MM/AAAA ou AAAA-MM-JJ.
 */
export function lireJour(cellule: Cellule): string | null {
  if (cellule instanceof Date) {
    return Number.isNaN(cellule.getTime())
      ? null
      : cellule.toISOString().slice(0, 10);
  }
  if (typeof cellule === 'number') {
    // Série Excel : 1 = 01/01/1900 ; 25569 = 01/01/1970.
    return Number.isInteger(cellule) && cellule > 0
      ? new Date((cellule - 25569) * 86_400_000).toISOString().slice(0, 10)
      : null;
  }
  const valeur = texte(cellule);
  const fr = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(valeur);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valeur);
  const [annee, mois, jour] = fr
    ? [Number(fr[3]), Number(fr[2]), Number(fr[1])]
    : iso
      ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
      : [0, 0, 0];
  const date = new Date(Date.UTC(annee, mois - 1, jour));
  return annee &&
    date.getUTCFullYear() === annee &&
    date.getUTCMonth() === mois - 1 &&
    date.getUTCDate() === jour
    ? date.toISOString().slice(0, 10)
    : null;
}

/** Durée en heures (nombre, ou texte avec virgule ou point) : > 0 et ≤ 24. */
export function lireHeures(cellule: Cellule): number | null {
  const valeur =
    typeof cellule === 'number'
      ? cellule
      : /^\d+([.,]\d+)?$/.test(texte(cellule))
        ? Number(texte(cellule).replace(',', '.'))
        : NaN;
  return Number.isFinite(valeur) && valeur > 0 && valeur <= 24
    ? Math.round(valeur * 10000) / 10000
    : null;
}

function decalageMinutes(instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSEAU_METIER,
    timeZoneName: 'longOffset',
  }).formatToParts(instant);
  const offset =
    parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+00:00';
  const match = /GMT([+-])(\d{2}):?(\d{2})?/.exec(offset);
  if (!match) {
    return 0;
  }
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return match[1] === '-' ? -minutes : minutes;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
