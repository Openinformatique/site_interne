import { SortDirection } from '../../../common/pagination/sort-direction.enum';
import { AuthenticationSource } from './authentication-source.enum';
import { User } from './user';
import { UserRole } from './user-role.enum';

/** Données nécessaires à la création d'un utilisateur. */
export interface CreateUserInput {
  /** E-mail déjà normalisé par l'appelant. */
  email: string;
  displayName: string;
  role: UserRole;
  /** Hash Argon2id déjà calculé ; null pour les comptes SSO. */
  passwordHash: string | null;
  authenticationSource: AuthenticationSource;
}

/** Critères de listage paginé (le tri est validé par liste blanche). */
export interface ListUsersQuery {
  page: number;
  limit: number;
  sortBy?: string;
  sortDirection: SortDirection;
  /** Recherche insensible à la casse sur e-mail et nom d'affichage. */
  search?: string;
  role?: UserRole;
  isActive?: boolean;
}

/** Page d'utilisateurs : items du domaine + total pour la pagination. */
export interface UsersPage {
  items: User[];
  totalItems: number;
}

/**
 * Contrat de persistance des utilisateurs.
 *
 * Défini dans le domaine, implémenté par l'infrastructure TypeORM.
 * Les recherches excluent les utilisateurs supprimés logiquement.
 */
export interface UserRepositoryPort {
  /** Recherche par identifiant ; null si inconnu ou supprimé. */
  findById(id: string): Promise<User | null>;

  /**
   * Recherche par e-mail (déjà normalisé par l'appelant) ;
   * null si inconnu ou supprimé.
   */
  findByEmail(email: string): Promise<User | null>;

  /** Liste paginée, triée et filtrée. */
  findPage(query: ListUsersQuery): Promise<UsersPage>;

  /** Crée un utilisateur et renvoie le modèle de domaine persisté. */
  create(input: CreateUserInput): Promise<User>;

  /** Remplace le rôle applicatif. */
  updateRole(id: string, role: UserRole): Promise<void>;

  /** Active ou désactive le compte (désactivation SOFT, jamais de DELETE). */
  setActive(id: string, isActive: boolean): Promise<void>;

  /** Remplace le hash du mot de passe local. */
  updatePasswordHash(id: string, passwordHash: string): Promise<void>;

  /** Nombre d'utilisateurs ACTIFS portant ce rôle. */
  countActiveByRole(role: UserRole): Promise<number>;

  /** Met à jour la date de dernière connexion. */
  updateLastLoginAt(id: string, lastLoginAt: Date): Promise<void>;
}

/** Jeton d'injection du repository utilisateurs. */
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
