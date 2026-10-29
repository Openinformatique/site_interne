import { Inject, Injectable } from '@nestjs/common';
import { ResourceAlreadyExistsException } from '../../../common/exceptions/app-exceptions';
import { AuditService } from '../../audit/application/audit.service';
import { AuditCategory } from '../../audit/domain/audit-category.enum';
import { PASSWORD_HASHER } from '../../authentication/domain/password-hasher.port';
import type { PasswordHasherPort } from '../../authentication/domain/password-hasher.port';
import { AuthenticationSource } from '../domain/authentication-source.enum';
import { normalizeEmail, User } from '../domain/user';
import { UserRole } from '../domain/user-role.enum';
import { USER_REPOSITORY } from '../domain/user-repository.port';
import type { UserRepositoryPort } from '../domain/user-repository.port';

/** Données de création (mot de passe en clair, haché ici même). */
export interface CreateUserCommand {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
}

/**
 * Cas d'utilisation : création d'un utilisateur local par un administrateur.
 *
 * L'unicité de l'e-mail est vérifiée AVANT insertion pour renvoyer un 409
 * propre (la contrainte d'unicité en base reste le filet de sécurité).
 */
@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,
    private readonly auditService: AuditService,
  ) {}

  async execute(command: CreateUserCommand, actorId: string): Promise<User> {
    const email = normalizeEmail(command.email);

    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new ResourceAlreadyExistsException(
        'Un utilisateur avec cet e-mail existe déjà.',
      );
    }

    const passwordHash = await this.passwordHasher.hash(command.password);
    const user = await this.userRepository.create({
      email,
      displayName: command.displayName.trim(),
      role: command.role,
      passwordHash,
      authenticationSource: AuthenticationSource.Local,
    });

    await this.auditService.record({
      category: AuditCategory.Security,
      action: 'user.created',
      actorUserId: actorId,
      resourceType: 'user',
      resourceId: user.id,
      metadata: { role: user.role },
    });

    return user;
  }
}
