import { Inject, Injectable } from '@nestjs/common';
import {
  BusinessRuleViolationException,
  ResourceNotFoundException,
} from '../../../common/exceptions/app-exceptions';
import { AuditService } from '../../audit/application/audit.service';
import { AuditCategory } from '../../audit/domain/audit-category.enum';
import { User } from '../domain/user';
import { UserRole } from '../domain/user-role.enum';
import { USER_REPOSITORY } from '../domain/user-repository.port';
import type { UserRepositoryPort } from '../domain/user-repository.port';

/**
 * Cas d'utilisation : changement du rôle d'un utilisateur.
 *
 * Règles métier :
 *   - interdit sur son propre compte (un administrateur ne peut ni se
 *     rétrograder ni s'auto-promouvoir) ;
 *   - interdit de rétrograder le DERNIER administrateur actif : il doit
 *     toujours rester au moins un compte capable d'administrer.
 *
 * Effet différé documenté : le claim role des access tokens déjà émis
 * n'est pas réécrit — le nouveau rôle est effectif au plus tard à
 * l'expiration de l'access token courant (le refresh relit la base).
 */
@Injectable()
export class ChangeUserRoleUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    targetUserId: string,
    newRole: UserRole,
    actorId: string,
  ): Promise<User> {
    if (targetUserId === actorId) {
      throw new BusinessRuleViolationException(
        'Vous ne pouvez pas modifier votre propre rôle.',
      );
    }

    const target = await this.userRepository.findById(targetUserId);
    if (!target) {
      throw new ResourceNotFoundException("L'utilisateur");
    }

    if (target.role === newRole) {
      return target;
    }

    if (
      target.role === UserRole.Admin &&
      target.isActive &&
      (await this.userRepository.countActiveByRole(UserRole.Admin)) <= 1
    ) {
      throw new BusinessRuleViolationException(
        'Impossible de rétrograder le dernier administrateur actif.',
      );
    }

    await this.userRepository.updateRole(targetUserId, newRole);
    await this.auditService.record({
      category: AuditCategory.Security,
      action: 'user.role.changed',
      actorUserId: actorId,
      resourceType: 'user',
      resourceId: targetUserId,
      metadata: { previousRole: target.role, newRole },
    });

    // Relecture : renvoie l'état réellement persisté (updated_at compris).
    const updated = await this.userRepository.findById(targetUserId);
    return updated ?? target;
  }
}
