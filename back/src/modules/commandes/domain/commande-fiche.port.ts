/** Champs saisis sur la fiche commande (création / modification). */
export interface CommandeInput {
  clientId: number;
  clientContratId: number | null;
  /** Clé TYPC. */
  typeCommande: string;
  numeroDevis: string | null;
  dateDevis: string;
  numeroCommandeClient: string | null;
  dateCommande: string;
  libelleCommande: string;
  nbJoursCommande: number;
  nbJoursPrevus: number;
  delai: string | null;
  montant: number | null;
  dateCloture: string | null;
}

/** Commande telle qu'affichée sur sa fiche. Dates en AAAA-MM-JJ. */
export interface CommandeDetail extends CommandeInput {
  id: number;
  /** Raison sociale du client. */
  client: string | null;
  clientActif: boolean;
  /** Au moins un pointage rattaché : le client n'est plus modifiable. */
  hasPointages: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}

/** Jours facturables pointés par une personne sur la commande. */
export interface TempsPersonne {
  utilisateurId: string | null;
  personne: string | null;
  jours: number;
  /** Date (AAAA-MM-JJ) du dernier pointage. */
  dernierPointage: string | null;
}

/** Un pointage de la commande (vue détaillée). */
export interface PointageCommande {
  id: number;
  date: string | null;
  personne: string | null;
  /** Clé TYPA et son libellé. */
  typeAction: string | null;
  typeActionLibelle: string | null;
  description: string | null;
  jours: number;
}

export interface CommandeTemps {
  personnes: TempsPersonne[];
  pointages: PointageCommande[];
}

/** Document joint à une commande. */
export interface CommandeDocument {
  id: number;
  nomFichier: string | null;
  /** Clé TDOC et son libellé. */
  typeDocument: string | null;
  typeDocumentLibelle: string | null;
  commentaire: string | null;
  typeMime: string;
  tailleOctets: number;
  createdAt: Date;
}

/** Référence du fichier stocké d'un document (téléchargement, suppression). */
export interface CommandeDocumentFichier {
  id: number;
  nomFichier: string | null;
  typeMime: string;
  fichierIdentifiant: string;
}

export interface NewCommandeDocument {
  commandeId: number;
  typeDocument: string;
  commentaire: string | null;
  nomFichier: string;
  typeMime: string;
  tailleOctets: number;
  fichierIdentifiant: string;
}

export interface CommandeFichePort {
  findCommande(id: number): Promise<CommandeDetail | null>;
  createCommande(input: CommandeInput, userId: string): Promise<number>;
  updateCommande(
    id: number,
    input: CommandeInput,
    userId: string,
  ): Promise<void>;
  /** Client existant (non supprimé) et son statut. */
  findClientActif(clientId: number): Promise<boolean | null>;
  contratBelongsToClient(contratId: number, clientId: number): Promise<boolean>;
  parametreExists(codeTable: string, cle: string): Promise<boolean>;
  temps(commandeId: number, heuresParJour: number): Promise<CommandeTemps>;
  listDocuments(commandeId: number): Promise<CommandeDocument[]>;
  findDocumentFichier(
    commandeId: number,
    documentId: number,
  ): Promise<CommandeDocumentFichier | null>;
  addDocument(document: NewCommandeDocument, userId: string): Promise<number>;
  deleteDocument(documentId: number): Promise<void>;
}

/** Jeton d'injection du repository de la fiche commande. */
export const COMMANDE_FICHE = Symbol('COMMANDE_FICHE');
