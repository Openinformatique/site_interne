/** Recherche globale (barre du haut) : clients, commandes et pointages contenant les termes. */

export interface ClientTrouve {
  id: number;
  codeClient: string | null;
  raisonSociale: string | null;
  ville: string | null;
  groupe: string | null;
  actif: boolean;
}

export interface CommandeTrouvee {
  id: number;
  clientId: number;
  codeClient: string | null;
  client: string | null;
  numeroCommande: string | null;
  numeroDevis: string | null;
  libelle: string | null;
  /** Libellé du contrat rattaché. */
  contrat: string | null;
  dateCommande: string | null;
  cloturee: boolean;
}

export interface PointageTrouve {
  id: number;
  utilisateurId: string;
  personne: string | null;
  /** Instant de début (UTC). */
  debut: Date;
  /** Jour du pointage à Paris (AAAA-MM-JJ). */
  jour: string;
  codeClient: string | null;
  /** N° de commande, sinon de devis. */
  commande: string | null;
  type: string | null;
  heures: number;
  description: string | null;
}

export interface Trouves<T> {
  /** Nombre total de résultats (au-delà de la limite). */
  total: number;
  items: T[];
}

export interface ResultatRecherche {
  /** Termes retenus (8 au plus). */
  termes: string[];
  clients: Trouves<ClientTrouve>;
  commandes: Trouves<CommandeTrouvee>;
  /** `heures` : total des pointages trouvés, au-delà de la limite. */
  pointages: Trouves<PointageTrouve> & { heures: number };
}

export const RECHERCHE = Symbol('RECHERCHE');

export interface RecherchePort {
  clients(
    termes: readonly string[],
    limite: number,
  ): Promise<Trouves<ClientTrouve>>;
  commandes(
    termes: readonly string[],
    limite: number,
  ): Promise<Trouves<CommandeTrouvee>>;
  /** `utilisateurId` null : pointages de toute l'équipe. */
  pointages(
    termes: readonly string[],
    utilisateurId: string | null,
    limite: number,
  ): Promise<Trouves<PointageTrouve> & { heures: number }>;
}
