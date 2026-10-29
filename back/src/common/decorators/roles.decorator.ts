import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../modules/users/domain/user-role.enum';

export const ROLES_KEY = 'roles';

/**
 * Restreint un handler (ou un contrôleur entier) aux rôles listés.
 *
 * Évalué par RolesGuard à partir du claim `role` de l'access token :
 * sans décoration, une route authentifiée reste accessible à tous les
 * rôles. Pour des permissions plus fines qu'un rôle global, préférer
 * @RequiresPermission + AuthorizationPort (voir docs/extending.md).
 */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
