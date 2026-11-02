/** Recherche globale (voir back/src/modules/recherche/README.md). */

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
  contrat: string | null;
  dateCommande: string | null;
  cloturee: boolean;
}

export interface PointageTrouve {
  id: number;
  utilisateurId: string;
  personne: string | null;
  debut: string;
  /** Jour à Paris (AAAA-MM-JJ). */
  jour: string;
  codeClient: string | null;
  commande: string | null;
  type: string | null;
  heures: number;
  description: string | null;
}

export interface Trouves<T> {
  total: number;
  items: T[];
}

export interface ResultatRecherche {
  termes: string[];
  clients: Trouves<ClientTrouve>;
  commandes: Trouves<CommandeTrouvee>;
  pointages: Trouves<PointageTrouve> & { heures: number };
}
