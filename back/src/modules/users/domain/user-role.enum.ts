/**
 * Rôle applicatif de l'utilisateur technique.
 *
 * Modèle minimal commun aux API bâties sur le socle :
 *   ADMIN    : administration complète (gestion des comptes) ;
 *   MANAGER  : consultation des utilisateurs ;
 *   EMPLOYEE : rôle par défaut, aucun accès d'administration.
 *
 * Le rôle est embarqué comme claim `role` de l'ACCESS token (courte durée) :
 * un changement de rôle est donc effectif au plus tard à l'expiration de
 * l'access token courant (le refresh relit le rôle en base). L'application
 * côté serveur est assurée par RolesGuard + @Roles() ; pour des permissions
 * plus fines, passer par AuthorizationPort (voir docs/extending.md).
 */
export enum UserRole {
  Admin = 'ADMIN',
  Manager = 'MANAGER',
  Employee = 'EMPLOYEE',
}
