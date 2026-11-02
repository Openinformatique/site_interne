/**
 * « Export (format CFL) » (Pointages › Éditions) : travaux réalisés pour un
 * client sur une période, filtrés par commande, personne, type et tags.
 */

/** Critères (dates « AAAA-MM-JJ », jours à Paris, bornes incluses). */
export interface ExportCflCriteres {
  du: string;
  au: string;
  clientId: number;
  commandeId: number | null;
  utilisateurId: string | null;
  typeAction: string | null;
  /** Au moins un de ces tags ; vide = tous. */
  tags: string[];
  /** Uniquement les pointages sans tag (ignore `tags`). */
  sansTag: boolean;
}

/** Pointage du client lu pour l'export. */
export interface ExportCflPointage {
  debut: Date;
  fin: Date;
  /** Jour du début à Paris, « AAAA-MM-JJ ». */
  jour: string;
  utilisateurId: string | null;
  /** Initiales / nom affiché du salarié. */
  salarie: string;
  /** Contact « NOM,Prénom » (format historique). */
  contact: string | null;
  commandeId: number | null;
  typeAction: string | null;
  description: string | null;
}

/** Ligne du PDF. */
export interface ExportCflLigne {
  date: string;
  demandeur: string;
  libelle: string;
  minutes: number;
  salarie: string;
}

/** Lecture des données de l'export. */
export interface ExportCflPort {
  /** Raison sociale (code client à défaut) ; null si le client n'existe pas. */
  nomClient(clientId: number): Promise<string | null>;
  /** Libellé d'une commande du client (« N° — libellé ») ; null sinon. */
  libelleCommande(clientId: number, commandeId: number): Promise<string | null>;
  /** Pointages du client commençant dans [depuis, jusqua[ (instants). */
  pointages(
    clientId: number,
    depuis: Date,
    jusqua: Date,
  ): Promise<ExportCflPointage[]>;
}

export const EXPORT_CFL = Symbol('EXPORT_CFL');

/** Tags en tête de la description : « [Tag 1] [ Tag 2 ] texte ». */
export function tagsDe(description: string | null): string[] {
  const tags: string[] = [];
  let texte = description ?? '';
  let match: RegExpExecArray | null;
  while ((match = /^\s*\[([^\]]*)\]/.exec(texte))) {
    const tag = (match[1] ?? '').trim();
    if (tag) {
      tags.push(tag);
    }
    texte = texte.slice(match[0].length);
  }
  return tags;
}

/** Comparaison des tags sans casse ni accents. */
export function normaliser(texte: string): string {
  return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Pointage retenu par les critères (le client et l'intervalle large sont déjà filtrés en base). */
export function pointageRetenu(
  pointage: ExportCflPointage,
  criteres: ExportCflCriteres,
): boolean {
  if (pointage.jour < criteres.du || pointage.jour > criteres.au) {
    return false;
  }
  if (
    criteres.commandeId !== null &&
    pointage.commandeId !== criteres.commandeId
  ) {
    return false;
  }
  if (
    criteres.utilisateurId !== null &&
    pointage.utilisateurId?.toLowerCase() !==
      criteres.utilisateurId.toLowerCase()
  ) {
    return false;
  }
  if (
    criteres.typeAction !== null &&
    pointage.typeAction !== criteres.typeAction
  ) {
    return false;
  }
  const tags = tagsDe(pointage.description);
  if (criteres.sansTag) {
    return tags.length === 0;
  }
  if (criteres.tags.length === 0) {
    return true;
  }
  const voulus = new Set(criteres.tags.map(normaliser));
  return tags.some((tag) => voulus.has(normaliser(tag)));
}

/** Durée du créneau en minutes. */
export function minutesDe(pointage: ExportCflPointage): number {
  return Math.round(
    (pointage.fin.getTime() - pointage.debut.getTime()) / 60_000,
  );
}

/** Lignes retenues, de la plus récente à la plus ancienne. */
export function lignesExport(
  pointages: readonly ExportCflPointage[],
  criteres: ExportCflCriteres,
): ExportCflLigne[] {
  return pointages
    .filter((pointage) => pointageRetenu(pointage, criteres))
    .sort((a, b) => b.debut.getTime() - a.debut.getTime())
    .map((pointage) => ({
      date: jourFr(pointage.jour),
      demandeur: (pointage.contact ?? '').replace(/\s*,\s*/g, ' ').trim(),
      libelle: (pointage.description ?? '').trim(),
      minutes: minutesDe(pointage),
      salarie: pointage.salarie,
    }));
}

/** « AAAA-MM-JJ » → « JJ/MM/AAAA ». */
export function jourFr(jour: string): string {
  const [annee, mois, date] = jour.split('-');
  return `${date}/${mois}/${annee}`;
}
