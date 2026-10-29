/**
 * Utilisateur authentifié tel qu'exposé dans le contexte HTTP.
 *
 * Type strict et minimal : les contrôleurs n'accèdent JAMAIS à l'entité
 * TypeORM ni au modèle de domaine complet via la requête. Récupéré dans
 * les handlers avec le décorateur @CurrentUser().
 */
import { UserRole } from '../../modules/users/domain/user-role.enum';

export interface AuthenticatedUser {
  /** Identifiant de l'utilisateur (claim sub du JWT). */
  userId: string;
  /** Identifiant de la session porteuse (claim sid du JWT). */
  sessionId: string;
  /**
   * Rôle applicatif (claim role de l'access token). Optionnel : absent
   * des jetons émis avant l'introduction des rôles — RolesGuard refuse
   * alors les routes restreintes tant que l'utilisateur ne s'est pas
   * reconnecté.
   */
  role?: UserRole;
}
