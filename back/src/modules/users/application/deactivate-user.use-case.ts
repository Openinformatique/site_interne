import { Inject, Injectable } from '@nestjs/common';
import {
  BusinessRuleViolationException,
  ResourceNotFoundException,
} from '../../../common/exceptions/app-exceptions';
import { AuditService } from '../../audit/application/audit.service';
import { AuditCategory } from '../../audit/domain/audit-category.enum';
import { USER_REPOSITORY } from '../domain/user-repository.port';
import type { UserRepositoryPort } from '../domain/user-repository.port';

/**
 * Cas d'utilisation : désactivation d'un compte (SOFT : is_active=false,
 * jamais de suppression de ligne).
 *
 * Effets : le compte ne peut plus se connecter (contrôlé au login) ni
 * rafraîchir sa session (contrôlé au refresh). Un access token déjà émis
 * reste valide jusqu'à sa courte expiration (choix documenté du socle).
 *
 * Interdit sur son propre compte : un administrateur ne peut pas
 * s'enfermer dehors (cela protège aussi le dernier administrateur actif).
 */
@Injectable()
export class DeactivateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    private readonly auditService: AuditService,
  ) {}

  async execute(targetUserId: string, actorId: string): Promise<void> {
    if (targetUserId === actorId) {
      throw new BusinessRuleViolationException(
        'Vous ne pouvez pas désactiver votre propre compte.',
      );
    }

    const target = await this.userRepository.findById(targetUserId);
    if (!target) {
      throw new ResourceNotFoundException("L'utilisateur");
    }

    if (!target.isActive) {
      return; // Déjà désactivé : idempotent, pas de nouvel audit.
    }

    await this.userRepository.setActive(targetUserId, false);
    await this.auditService.record({
      category: AuditCategory.Security,
      action: 'user.deactivated',
      actorUserId: actorId,
      resourceType: 'user',
      resourceId: targetUserId,
    });
  }
}
