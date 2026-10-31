/** Niveau de la barre d'avancement (jours passés / jours prévus). */
export type AvancementNiveau = 'ok' | 'alerte' | 'depassement' | 'aucun';

export interface Avancement {
  /** Pourcentage des jours prévus ; null si les jours prévus valent 0. */
  pourcentage: number | null;
  niveau: AvancementNiveau;
  /** Jours au-delà des jours prévus (0 sans dépassement). */
  depassement: number;
}

/** Seuil (en %) à partir duquel la barre passe à l'orange. */
export const SEUIL_ALERTE = 80;

/** Bleu sous 80 %, orange de 80 à 100 %, rouge au-delà ; « aucun » sans jours prévus. */
export function avancement(joursPasses: number, joursPrevus: number): Avancement {
  if (!(joursPrevus > 0)) {
    return { pourcentage: null, niveau: 'aucun', depassement: 0 };
  }
  const pourcentage = (joursPasses / joursPrevus) * 100;
  const niveau: AvancementNiveau = joursPasses > joursPrevus ? 'depassement' : pourcentage >= SEUIL_ALERTE ? 'alerte' : 'ok';
  return { pourcentage, niveau, depassement: Math.max(0, joursPasses - joursPrevus) };
}

/** Saisie décimale (virgule ou point, espaces ignorés) ; null si vide ou invalide. */
export function parseDecimal(text: string): number | null {
  const normalized = text.replace(/\s/g, '').replace(',', '.');
  if (!normalized || !/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }
  return Number(normalized);
}

/** Nombre → saisie (virgule décimale) ; vide pour null. */
export function decimalText(value: number | null): string {
  return value === null ? '' : String(value).replace('.', ',');
}

/** Nombre de jours affiché (2 décimales au plus, virgule). */
export function formatJoursCourts(value: number): string {
  return String(Math.round(value * 100) / 100).replace('.', ',');
}

/** Famille d'un fichier, pour l'aperçu des vignettes. */
export type FichierFamille = 'pdf' | 'word' | 'excel' | 'image' | 'autre';

export interface FichierFormat {
  /** Extension affichée (PDF, DOCX…). */
  extension: string;
  famille: FichierFamille;
}

/** Format d'un document d'après son type MIME, à défaut son extension. */
export function fichierFormat(typeMime: string, nomFichier: string | null): FichierFormat {
  const extension = (/\.([a-z0-9]{1,5})$/i.exec(nomFichier ?? '')?.[1] ?? '').toUpperCase();
  const famille: FichierFamille =
    typeMime === 'application/pdf' ? 'pdf'
      : typeMime.startsWith('image/') ? 'image'
        : /word|opendocument\.text|rtf/.test(typeMime) ? 'word'
          : /excel|spreadsheet|csv/.test(typeMime) ? 'excel'
            : 'autre';
  return { extension: extension || (famille === 'autre' ? 'FICHIER' : famille.toUpperCase()), famille };
}

/** Taille lisible : « 245 Ko », « 1,2 Mo ». */
export function formatTaille(octets: number): string {
  if (octets < 1024) {
    return `${octets} o`;
  }
  if (octets < 1024 * 1024) {
    return `${Math.round(octets / 1024)} Ko`;
  }
  return `${(Math.round((octets / (1024 * 1024)) * 10) / 10).toString().replace('.', ',')} Mo`;
}

/** Ouverture dans le navigateur (plutôt que téléchargement) : PDF et images matricielles. */
export function ouvrableDansNavigateur(typeMime: string): boolean {
  return ['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(typeMime);
}
