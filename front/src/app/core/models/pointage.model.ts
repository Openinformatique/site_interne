/** Codes « facturable » : 0 non, 1 oui, 2 en attente (3 et 4 : codes repris, vus « en attente »). */
export const FACTURABLE = { non: 0, oui: 1, enAttente: 2 } as const;

/** Pointage du planning. Instants ISO 8601 (UTC), affichés en heure locale. */
export interface Pointage {
  id: number;
  utilisateurId: string;
  debut: string;
  fin: string;
  /** Clé TYPA. */
  typeAction: string;
  clientId: number | null;
  /** Code client (nom court) et raison sociale. */
  clientCode: string | null;
  clientNom: string | null;
  commandeId: number | null;
  /** Numéro de commande client, sinon numéro de devis. */
  commandeNumero: string | null;
  contactId: number | null;
  contactNom: string | null;
  /** Description, tags entre crochets en tête : « [Tag] texte ». */
  description: string | null;
  facturable: number;
  /** Durée imputée au contrat / à la commande, en heures. */
  tempsFacturable: number | null;
}

/** Corps de POST /pointages et PUT /pointages/:id. */
export interface PointageInput {
  utilisateurId: string;
  debut: string;
  fin: string;
  typeAction: string;
  clientId: number | null;
  commandeId: number | null;
  contactId: number | null;
  description: string | null;
  facturable: number;
  tempsFacturable: number | null;
}

/** Type d'action (TYPA) et sa couleur de planning « R,V,B ». */
export interface TypeAction {
  cle: string;
  libelle: string;
  couleur: string | null;
}

export interface PersonneOption {
  id: string;
  nom: string;
}

export interface PointageClientOption {
  id: number;
  code: string | null;
  nom: string | null;
}

export interface PointagesReference {
  types: TypeAction[];
  /** Libellés des tags du paramétrage (TAGS). */
  tags: string[];
  /** Personnes sélectionnables (l'utilisateur seul, sauf Admin / Direction). */
  personnes: PersonneOption[];
  clients: PointageClientOption[];
}

export interface PointageContactOption {
  id: number;
  nom: string | null;
  actif: boolean;
}

export interface PointageCommandeOption {
  id: number;
  numero: string | null;
  libelle: string | null;
  /** Commande rattachée à un contrat client (assistance). */
  contrat: boolean;
  cloturee: boolean;
}

export interface ClientPointageOptions {
  contacts: PointageContactOption[];
  commandes: PointageCommandeOption[];
}

/** Jour ouvré où l'utilisateur connecté a pointé moins de 7 h (cloche d'alertes). */
export interface JourIncomplet {
  /** AAAA-MM-JJ. */
  jour: string;
  heures: number;
  manquantes: number;
  /** Jours écoulés (1 = hier). */
  joursEcoules: number;
}

/** Import Excel : contrôle d'une colonne de la ligne 1. */
export interface ControleColonneImport {
  lettre: string;
  /** Vide pour une colonne en trop. */
  attendu: string;
  lu: string | null;
  conforme: boolean;
}

export interface ErreurImport {
  /** Ligne Excel ; null : tout le fichier. */
  ligne: number | null;
  /** « D – Devis » ; null : toute la ligne. */
  colonne: string | null;
  valeur: string | null;
  message: string;
}

export interface PointageImporte {
  ligne: number;
  jour: string;
  debut: string;
  fin: string;
  /** Code client ; null : interne. */
  client: string | null;
  type: string;
  commande: string | null;
  contact: string | null;
  tags: { libelle: string; parametre: boolean }[];
  description: string;
  heures: number;
}

export interface ResultatImport {
  /** null : fichier illisible. */
  format: { conforme: boolean; colonnes: ControleColonneImport[] } | null;
  erreurs: ErreurImport[];
  pointages: PointageImporte[];
  importes: number;
}
