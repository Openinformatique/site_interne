import { FUSEAU_METIER } from '../../../common/utils/sql-date.util';
import type {
  ReleveFacturable,
  ReleveMensuelPdfClient,
  ReleveMensuelPdfCommande,
  ReleveMensuelPdfType,
} from '../../pdf/domain/pdf-generator.port';
import { FACTURABLE, TYPES_ABSENCE } from './pointage.port';
import type { Pointage, TypeAction } from './pointage.port';

/** Groupe du temps sans client, comme dans l'ancien relevé. */
export const CLIENT_INTERNE = 'INTERNE';

const MOIS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

/** Relevé d'une personne sur un mois : groupes et totaux. */
export interface Releve {
  groupes: ReleveMensuelPdfClient[];
  total: number;
  /** Temps passé chez les clients. */
  clients: number;
  /** Temps interne hors absences. */
  interne: number;
  /** Congés, fériés, arrêts. */
  absences: number;
}

/** Génération du classeur Excel du relevé (version détaillée). */
export interface ReleveSpreadsheetPort {
  build(titre: string, releve: Releve): Promise<Buffer>;
}

export const RELEVE_SPREADSHEET = Symbol('RELEVE_SPREADSHEET');

/** « Septembre 2026 » (mois de 1 à 12). */
export function libelleMois(annee: number, mois: number): string {
  return `${MOIS[mois - 1]} ${annee}`;
}

/**
 * Bornes [du, au[ du mois (1 à 12) en heure de Paris : minuit le 1er du mois
 * et minuit le 1er du mois suivant.
 */
export function bornesDuMois(
  annee: number,
  mois: number,
): { du: Date; au: Date } {
  return {
    du: minuitMetier(annee, mois),
    au:
      mois === 12 ? minuitMetier(annee + 1, 1) : minuitMetier(annee, mois + 1),
  };
}

/** Minuit le 1er du mois, heure de Paris (jamais un jour de changement d'heure). */
function minuitMetier(annee: number, mois: number): Date {
  const utc = Date.UTC(annee, mois - 1, 1);
  return new Date(utc - decalageMinutes(new Date(utc)) * 60_000);
}

/** Avance de l'heure de Paris sur UTC à cet instant, en minutes. */
function decalageMinutes(instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSEAU_METIER,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).formatToParts(instant);
  const part = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  const local = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
  );
  return (local - instant.getTime()) / 60_000;
}

export function statutFacturable(code: number): ReleveFacturable {
  if (code === FACTURABLE.oui) {
    return 'oui';
  }
  return code === FACTURABLE.non ? 'non' : 'attente';
}

/**
 * Relevé à la manière de l'ancienne édition : Client (code) › type d'action
 * (libellé) › commande, puis une ligne par description et statut facturable,
 * heures cumulées. Temps = durée des créneaux. Tri binaire (majuscules, puis
 * « [ », puis minuscules), comme l'ancien relevé.
 *
 * Seuls les pointages commençant dans [du, au[ sont retenus.
 */
export function construireReleve(
  pointages: Pointage[],
  types: TypeAction[],
  du: Date,
  au: Date,
): Releve {
  const typeParCle = new Map(types.map((type) => [type.cle, type]));
  const clients = new Map<string, Map<string, Map<string, Pointage[]>>>();
  let total = 0;
  let interne = 0;
  let absences = 0;

  for (const pointage of pointages) {
    if (pointage.debut < du || pointage.debut >= au) {
      continue;
    }
    const heures = dureeHeures(pointage);
    total += heures;
    if (TYPES_ABSENCE.includes(pointage.typeAction)) {
      absences += heures;
    } else if (pointage.clientId === null) {
      interne += heures;
    }
    const client =
      pointage.clientId === null
        ? CLIENT_INTERNE
        : pointage.clientCode || pointage.clientNom || CLIENT_INTERNE;
    const parType = getOrSet(
      clients,
      client,
      () => new Map<string, Map<string, Pointage[]>>(),
    );
    const parCommande = getOrSet(
      parType,
      pointage.typeAction,
      () => new Map<string, Pointage[]>(),
    );
    getOrSet(
      parCommande,
      pointage.commandeNumero ?? '',
      (): Pointage[] => [],
    ).push(pointage);
  }

  const groupes = [...clients.entries()]
    .sort(([a], [b]) => binaire(a, b))
    .map(([client, parType]): ReleveMensuelPdfClient => {
      const typesDuClient = [...parType.entries()]
        .map(([cle, parCommande]): ReleveMensuelPdfType => {
          const commandes = [...parCommande.entries()]
            .sort(([a], [b]) => binaire(a, b))
            .map(([numero, liste]) => commande(numero, liste));
          return {
            libelle: typeParCle.get(cle)?.libelle ?? cle,
            couleur: typeParCle.get(cle)?.couleur ?? null,
            heures: somme(commandes.map((c) => c.heures)),
            commandes,
          };
        })
        .sort((a, b) => binaire(a.libelle, b.libelle));
      return {
        client,
        heures: somme(typesDuClient.map((t) => t.heures)),
        types: typesDuClient,
      };
    });

  return {
    groupes,
    total: arrondi(total),
    clients: arrondi(total - interne - absences),
    interne: arrondi(interne),
    absences: arrondi(absences),
  };
}

function commande(
  numero: string,
  pointages: Pointage[],
): ReleveMensuelPdfCommande {
  const lignes = new Map<string, ReleveMensuelPdfCommande['lignes'][number]>();
  for (const pointage of pointages) {
    const description = pointage.description?.trim() ?? '';
    const facturable = statutFacturable(pointage.facturable);
    const cle = `${facturable}\u0000${description}`;
    const ligne = getOrSet(lignes, cle, () => ({
      description,
      heures: 0,
      facturable,
    }));
    ligne.heures = arrondi(ligne.heures + dureeHeures(pointage));
  }
  const ordreStatut = { oui: 0, non: 1, attente: 2 };
  const triees = [...lignes.values()].sort(
    (a, b) =>
      binaire(a.description, b.description) ||
      ordreStatut[a.facturable] - ordreStatut[b.facturable],
  );
  return {
    numero: numero || null,
    heures: somme(triees.map((ligne) => ligne.heures)),
    lignes: triees,
  };
}

function dureeHeures(pointage: Pointage): number {
  return (pointage.fin.getTime() - pointage.debut.getTime()) / 3_600_000;
}

function somme(valeurs: number[]): number {
  return arrondi(valeurs.reduce((total, valeur) => total + valeur, 0));
}

/** Au centième d'heure : écarte les résidus de calcul flottant. */
function arrondi(heures: number): number {
  return Math.round(heures * 100) / 100;
}

function binaire(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function getOrSet<K, V>(map: Map<K, V>, key: K, create: () => V): V {
  let value = map.get(key);
  if (value === undefined) {
    value = create();
    map.set(key, value);
  }
  return value;
}
