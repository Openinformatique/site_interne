/**
 * Codes de la colonne `facturable` : 0 et 1 viennent de l'application
 * historique ; 2 (« en attente ») est propre à la nouvelle application.
 * Les codes 3 et 4, présents dans les données reprises, sont conservés tels
 * quels (affichés « en attente »).
 */
export const FACTURABLE = { non: 0, oui: 1, enAttente: 2 } as const;
export const FACTURABLE_CODES = [0, 1, 2, 3, 4];

/** Types d'action (TYPA) sans client : temps interne, congés, fériés, arrêts. */
export const TYPES_SANS_CLIENT = ['AUTRE', 'CP', 'FERIE', 'ARRET'];
/** Développement sur devis : commande hors contrat obligatoire. */
export const TYPES_COMMANDE = ['DEVIS'];
/** Assistance sur contrat / téléphonique : commande sous contrat et contact obligatoires. */
export const TYPES_CONTRAT = ['ASSC', 'ASST'];

/** Champs saisis d'un pointage. Instants en ISO 8601 (stockés en UTC). */
export interface PointageInput {
  utilisateurId: string;
  debut: Date;
  fin: Date;
  /** Clé TYPA. */
  typeAction: string;
  clientId: number | null;
  commandeId: number | null;
  contactId: number | null;
  /** Description, tags entre crochets en tête (« [Tag] texte »). */
  description: string | null;
  facturable: number;
  /** Durée imputée au contrat / à la commande, en heures. */
  tempsFacturable: number | null;
}

/** Pointage affiché sur le planning. */
export interface Pointage extends PointageInput {
  id: number;
  /** Code client (nom court) et raison sociale. */
  clientCode: string | null;
  clientNom: string | null;
  /** Numéro de commande client, sinon numéro de devis. */
  commandeNumero: string | null;
  contactNom: string | null;
}

/** Type d'action (TYPA) : libellé et couleur du planning (« R,V,B »). */
export interface TypeAction {
  cle: string;
  libelle: string;
  couleur: string | null;
}

export interface PersonneOption {
  id: string;
  nom: string;
}

export interface ClientOption {
  id: number;
  code: string | null;
  nom: string | null;
}

export interface ContactOption {
  id: number;
  nom: string | null;
  actif: boolean;
}

export interface CommandeOption {
  id: number;
  numero: string | null;
  libelle: string | null;
  /** Commande rattachée à un contrat client (assistance). */
  contrat: boolean;
  cloturee: boolean;
}

/** Commande vue par les règles de saisie. */
export interface CommandeRef {
  clientId: number;
  contrat: boolean;
}

export interface PointagePort {
  list(utilisateurId: string, du: Date, au: Date): Promise<Pointage[]>;
  find(id: number): Promise<Pointage | null>;
  create(input: PointageInput, userId: string): Promise<number>;
  update(id: number, input: PointageInput, userId: string): Promise<void>;
  delete(id: number): Promise<void>;

  typesAction(): Promise<TypeAction[]>;
  /** Libellés des tags du paramétrage (TAGS). */
  tags(): Promise<string[]>;
  personnes(): Promise<PersonneOption[]>;
  /** Clients actifs (raison sociale). */
  clients(): Promise<ClientOption[]>;
  contacts(clientId: number): Promise<ContactOption[]>;
  commandes(clientId: number): Promise<CommandeOption[]>;

  userExists(id: string): Promise<boolean>;
  clientExists(id: number): Promise<boolean>;
  findCommande(id: number): Promise<CommandeRef | null>;
  /** Client du contact, null si inconnu. */
  contactClient(id: number): Promise<number | null>;
  typeActionExists(cle: string): Promise<boolean>;
}

/** Jeton d'injection du repository des pointages. */
export const POINTAGES = Symbol('POINTAGES');
