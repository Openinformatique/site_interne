import { isoDate, normalize } from '../pointages.utils';

/** Mois en cours : du 1er au dernier jour. */
export function moisEnCours(aujourdHui: Date = new Date()): { du: string; au: string } {
  return {
    du: isoDate(new Date(aujourdHui.getFullYear(), aujourdHui.getMonth(), 1)),
    au: isoDate(new Date(aujourdHui.getFullYear(), aujourdHui.getMonth() + 1, 0)),
  };
}

/** Mois précédant celui qui contient `du` (raccourci « Mois précédent »). */
export function moisPrecedent(du: string, aujourdHui: Date = new Date()): { du: string; au: string } {
  const base = du ? new Date(`${du}T00:00:00`) : aujourdHui;
  return {
    du: isoDate(new Date(base.getFullYear(), base.getMonth() - 1, 1)),
    au: isoDate(new Date(base.getFullYear(), base.getMonth(), 0)),
  };
}

/** Erreurs de saisie (mêmes messages que le back). */
export function erreursExport(du: string, au: string, clientId: number | null): Record<string, string> {
  const erreurs: Record<string, string> = {};
  if (!du || !au) {
    erreurs['periode'] = 'Période obligatoire.';
  } else if (au < du) {
    erreurs['periode'] = 'La date de fin doit suivre la date de début.';
  } else if ((Date.parse(au) - Date.parse(du)) / 86_400_000 >= 366) {
    erreurs['periode'] = 'La période est limitée à un an.';
  }
  if (clientId === null) {
    erreurs['client'] = 'Choisissez un client.';
  }
  return erreurs;
}

/** Ajoute un tag (libellé du paramétrage si reconnu), sans doublon ni crochets. */
export function ajouterTag(tags: readonly string[], saisie: string, catalogue: readonly string[]): string[] {
  const valeur = saisie.replace(/[[\],]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!valeur) {
    return [...tags];
  }
  const libelle = catalogue.find((tag) => normalize(tag) === normalize(valeur)) ?? valeur;
  return tags.some((tag) => normalize(tag) === normalize(libelle)) ? [...tags] : [...tags, libelle];
}
