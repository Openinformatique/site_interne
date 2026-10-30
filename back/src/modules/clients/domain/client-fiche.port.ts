/**
 * Port de la fiche client : lecture/écriture du client et de ses contrats,
 * contacts et commandes. Les dates « jour » circulent au format YYYY-MM-DD.
 */

/** Champs saisissables d'un client. */
export interface ClientInput {
  codeClient: string;
  raisonSociale: string;
  actif: boolean;
  adresse1: string | null;
  adresse2: string | null;
  adresse3: string | null;
  codePostal: string;
  ville: string;
  codePays: string;
  groupe: string | null;
  numeroTva: string | null;
  modeReglement: string | null;
}

/** Client complet, avec sa traçabilité (auteurs : nom d'affichage, null si inconnu). */
export interface ClientDetail extends Omit<
  ClientInput,
  'codePostal' | 'ville' | 'codePays' | 'codeClient' | 'raisonSociale'
> {
  id: number;
  codeClient: string | null;
  raisonSociale: string | null;
  codePostal: string | null;
  ville: string | null;
  codePays: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface ContratInput {
  libelleContrat: string;
  dateMiseEnPlace: string;
  dateEcheance: string | null;
}

/** Contrat avec son suivi (heures). */
export interface ContratSummary {
  id: number;
  libelleContrat: string | null;
  dateMiseEnPlace: string | null;
  dateEcheance: string | null;
  /** Heures créditées : jours commandés × heures par jour. */
  credit: number;
  /** Heures débitées : temps facturable des pointages des commandes du contrat. */
  debit: number;
  restant: number;
}

/** Mouvement du suivi d'un contrat : commande (crédit) ou pointage (débit). */
export interface ContratMouvement {
  type: 'COMMANDE' | 'POINTAGE';
  date: string | null;
  libelle: string;
  /** Login du salarié (pointage). */
  utilisateur: string | null;
  credit: number;
  debit: number;
}

export interface ContactInput {
  /** 1 = M., 2 = Mme. */
  civilite: number;
  nom: string;
  prenom: string | null;
  poste: string;
  telephone: string | null;
  adresseEmail: string | null;
  actif: boolean;
}

export interface Contact extends ContactInput {
  id: number;
}

export interface ClientCommandesFilter {
  /** false (défaut) : commandes non clôturées uniquement. */
  includeClosed: boolean;
  /** Période : date du devis OU date de commande comprise dans [du, au]. */
  du: string | null;
  au: string | null;
}

export interface CommandeSummary {
  id: number;
  numeroCommande: string | null;
  numeroDevis: string | null;
  dateDevis: string | null;
  dateCommande: string | null;
  /** Clé de paramètre TYPC. */
  typeCommande: string | null;
  contrat: string | null;
  delai: string | null;
  joursPrevus: number | null;
  /** Heures pointées sur la commande ÷ heures par jour. */
  joursPasses: number;
  libelle: string | null;
  dateCloture: string | null;
}

export interface ClientFichePort {
  findClient(id: number): Promise<ClientDetail | null>;
  /** Un autre client (non supprimé) porte-t-il ce code (casse ignorée) ? */
  codeExists(codeClient: string, excludeId?: number): Promise<boolean>;
  createClient(input: ClientInput, userId: string): Promise<number>;
  updateClient(id: number, input: ClientInput, userId: string): Promise<void>;

  listContrats(
    clientId: number,
    heuresParJour: number,
  ): Promise<ContratSummary[]>;
  contratBelongsTo(clientId: number, contratId: number): Promise<boolean>;
  listMouvements(
    contratId: number,
    heuresParJour: number,
  ): Promise<ContratMouvement[]>;
  createContrat(
    clientId: number,
    input: ContratInput,
    userId: string,
  ): Promise<number>;
  updateContrat(
    contratId: number,
    input: ContratInput,
    userId: string,
  ): Promise<void>;

  listContacts(clientId: number): Promise<Contact[]>;
  contactBelongsTo(clientId: number, contactId: number): Promise<boolean>;
  createContact(
    clientId: number,
    input: ContactInput,
    userId: string,
  ): Promise<number>;
  updateContact(
    contactId: number,
    input: ContactInput,
    userId: string,
  ): Promise<void>;

  listCommandes(
    clientId: number,
    filter: ClientCommandesFilter,
    heuresParJour: number,
  ): Promise<CommandeSummary[]>;

  /** Heures par jour (paramètre TDIV/HJOUR), 8 par défaut. */
  heuresParJour(): Promise<number>;
}

/** Jeton d'injection du port de la fiche client. */
export const CLIENT_FICHE = Symbol('CLIENT_FICHE');
