import { UserRole } from './enums';

/**
 * Utilisateur connecté, tel que le front le manipule.
 * `role` NE vient PAS de /auth/login ni de /auth/me (qui ne renvoient que
 * id/email/displayName) : il est chargé via GET /users/me. Voir AuthStore.
 */
export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
}
