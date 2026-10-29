import { Inject, Injectable } from '@nestjs/common';
import { ResourceNotFoundException } from '../../../common/exceptions/app-exceptions';
import { AuditService } from '../../audit/application/audit.service';
import { AuditCategory } from '../../audit/domain/audit-category.enum';
import { User } from '../domain/user';
import { USER_REPOSITORY } from '../domain/user-repository.port';
import type { UserRepositoryPort } from '../domain/user-repository.port';

/**
 * Cas d'utilisation : réactivation d'un compte désactivé.
 * Idempotent : réactiver un compte déjà actif renvoie simplement son état.
 */
@Injectable()
export class ReactivateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    private readonly auditService: AuditService,
  ) {}

  async execute(targetUserId: string, actorId: string): Promise<User> {
    const target = await this.userRepository.findById(targetUserId);
    if (!target) {
      throw new ResourceNotFoundException("L'utilisateur");
    }

    if (target.isActive) {
      return target;
    }

    await this.userRepository.setActive(targetUserId, true);
    await this.auditService.record({
      category: AuditCategory.Security,
      action: 'user.reactivated',
      actorUserId: actorId,
      resourceType: 'user',
      resourceId: targetUserId,
    });

    const updated = await this.userRepository.findById(targetUserId);
    return updated ?? target;
  }
}
