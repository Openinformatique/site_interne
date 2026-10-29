import { Inject, Injectable } from '@nestjs/common';
import {
  BusinessRuleViolationException,
  ResourceNotFoundException,
} from '../../../common/exceptions/app-exceptions';
import { AuditService } from '../../audit/application/audit.service';
import { AuditCategory } from '../../audit/domain/audit-category.enum';
import { PASSWORD_HASHER } from '../../authentication/domain/password-hasher.port';
import type { PasswordHasherPort } from '../../authentication/domain/password-hasher.port';
import { USER_REPOSITORY } from '../domain/user-repository.port';
import type { UserRepositoryPort } from '../domain/user-repository.port';

/**
 * Cas d'utilisation : changement de son propre mot de passe.
 *
 * Le mot de passe ACTUEL est exigé et vérifié (protection contre un poste
 * laissé déverrouillé : un tiers ne peut pas changer le mot de passe sans
 * le connaître). Un mot de passe actuel erroné renvoie 409
 * BUSINESS_RULE_VIOLATION — pas 401, l'identité n'est pas en cause.
 */
@Injectable()
export class ChangeOwnPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ResourceNotFoundException("L'utilisateur");
    }

    if (user.passwordHash === null) {
      throw new BusinessRuleViolationException(
        "Ce compte n'a pas de mot de passe local.",
      );
    }

    const currentMatches = await this.passwordHasher.verify(
      user.passwordHash,
      currentPassword,
    );
    if (!currentMatches) {
      throw new BusinessRuleViolationException(
        'Le mot de passe actuel est incorrect.',
      );
    }

    const newHash = await this.passwordHasher.hash(newPassword);
    await this.userRepository.updatePasswordHash(userId, newHash);

    await this.auditService.record({
      category: AuditCategory.Security,
      action: 'user.password.changed',
      actorUserId: userId,
      resourceType: 'user',
      resourceId: userId,
    });
  }
}
