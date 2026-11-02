/**
 * Contrat de génération de PDF.
 *
 * `template` identifie un gabarit connu de l'implémentation ;
 * `data` porte les données typées attendues par ce gabarit.
 * Le résultat est un Buffer prêt à être renvoyé en téléchargement.
 */
export interface PdfGeneratorPort {
  generate<TData>(template: string, data: TData): Promise<Buffer>;
}

/** Jeton d'injection du générateur PDF. */
export const PDF_GENERATOR = Symbol('PDF_GENERATOR');

/** Gabarits disponibles dans cette version du socle. */
export const PDF_TEMPLATE_TECHNICAL_DEMO = 'technical-demo';

/** Édition « Suivi du contrat d'assistance » (fiche client › contrat). */
export const PDF_TEMPLATE_SUIVI_CONTRAT = 'suivi-contrat';

/** Ligne du suivi : pointage (débit) ou commande (crédit, surlignée). */
export interface SuiviContratPdfLigne {
  /** « JJ/MM/AAAA ». */
  date: string;
  demandeur: string;
  nature: string;
  /** Heures ; 0 = cellule vide. */
  debit: number;
  credit: number;
  commande: boolean;
}

/** Données de l'édition « Suivi du contrat ». */
export interface SuiviContratPdfData {
  client: string;
  libelleContrat: string;
  credit: number;
  debit: number;
  solde: number;
  /** Date de la plus récente à la plus ancienne. */
  lignes: SuiviContratPdfLigne[];
  /** « JJ/MM/AAAA », en pied de chaque page. */
  editeLe: string;
}

/** Édition « Relevé mensuel des pointages » (écran Pointages › Éditions). */
export const PDF_TEMPLATE_RELEVE_MENSUEL = 'releve-mensuel';

/** Statut facturable d'une ligne du relevé (codes 2 à 4 : en attente). */
export type ReleveFacturable = 'oui' | 'non' | 'attente';

/** Pointages de même description et de même statut, cumulés. */
export interface ReleveMensuelPdfLigne {
  description: string;
  heures: number;
  facturable: ReleveFacturable;
}

export interface ReleveMensuelPdfCommande {
  /** N° de commande client, sinon n° de devis ; null : sans commande. */
  numero: string | null;
  heures: number;
  lignes: ReleveMensuelPdfLigne[];
}

export interface ReleveMensuelPdfType {
  libelle: string;
  /** Couleur TYPA « R,V,B », null si non paramétrée. */
  couleur: string | null;
  heures: number;
  commandes: ReleveMensuelPdfCommande[];
}

export interface ReleveMensuelPdfClient {
  /** Code client (« INTERNE » pour le temps sans client). */
  client: string;
  heures: number;
  types: ReleveMensuelPdfType[];
}

/** Données de l'édition « Relevé mensuel ». */
export interface ReleveMensuelPdfData {
  personne: string;
  /** « Septembre 2026 ». */
  periode: string;
  /** Synthèse : une ligne par client et type d'action, sans totaux. */
  synthese: boolean;
  total: number;
  clients: number;
  interne: number;
  absences: number;
  groupes: ReleveMensuelPdfClient[];
  /** « JJ/MM/AAAA », en pied de chaque page. */
  editeLe: string;
}

/** Données du gabarit de démonstration technique. */
export interface TechnicalDemoPdfData {
  generatedAt: Date;
  userId: string;
  requestId: string | null;
}
