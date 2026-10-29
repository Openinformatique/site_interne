import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestWithUser } from '../decorators/current-user.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AccessDeniedException } from '../exceptions/app-exceptions';
import { UserRole } from '../../modules/users/domain/user-role.enum';

/**
 * Guard global d'application des rôles.
 *
 * Enregistré APRÈS JwtAuthGuard (ordre des providers APP_GUARD) : quand il
 * s'exécute, request.user est déjà posé pour les routes protégées. Une
 * route sans métadonnées @Roles() passe telle quelle (les routes @Public()
 * n'en portent jamais). Le rôle est lu depuis le claim de l'access token :
 * un jeton émis avant l'introduction des rôles n'en porte pas et se voit
 * refuser les routes restreintes jusqu'à reconnexion.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      UserRole[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();
    if (!user?.role || !requiredRoles.includes(user.role)) {
      throw new AccessDeniedException();
    }

    return true;
  }
}
