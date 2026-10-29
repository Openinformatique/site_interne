import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { PASSWORD_HASHER } from '../authentication/domain/password-hasher.port';
import { Argon2PasswordHasher } from '../authentication/infrastructure/argon2-password-hasher';
import { ChangeOwnPasswordUseCase } from './application/change-own-password.use-case';
import { ChangeUserRoleUseCase } from './application/change-user-role.use-case';
import { CreateUserUseCase } from './application/create-user.use-case';
import { DeactivateUserUseCase } from './application/deactivate-user.use-case';
import { GetUserByIdUseCase } from './application/get-user-by-id.use-case';
import { ListUsersUseCase } from './application/list-users.use-case';
import { ReactivateUserUseCase } from './application/reactivate-user.use-case';
import { USER_REPOSITORY } from './domain/user-repository.port';
import { UserEntity } from './infrastructure/entities/user.entity';
import { TypeOrmUserRepository } from './infrastructure/typeorm-user.repository';
import { UserMapper } from './infrastructure/user.mapper';
import { UsersController } from './presentation/users.controller';

/**
 * Module des utilisateurs techniques.
 *
 * Expose la gestion des comptes pour le front d'administration
 * (UsersController : profil, liste, création, rôle, activation, mot de
 * passe). Les routes d'administration sont restreintes par rôle.
 *
 * PASSWORD_HASHER est lié ici aussi (même implémentation Argon2 que le
 * module d'authentification) : importer AuthenticationModule créerait un
 * cycle, celui-ci important déjà UsersModule.
 *
 * Le repository (port USER_REPOSITORY) et les cas d'utilisation sont
 * exportés pour le module d'authentification.
 */
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity]), AuditModule],
  controllers: [UsersController],
  providers: [
    UserMapper,
    GetUserByIdUseCase,
    ListUsersUseCase,
    CreateUserUseCase,
    ChangeUserRoleUseCase,
    DeactivateUserUseCase,
    ReactivateUserUseCase,
    ChangeOwnPasswordUseCase,
    {
      provide: PASSWORD_HASHER,
      useClass: Argon2PasswordHasher,
    },
    {
      provide: USER_REPOSITORY,
      useClass: TypeOrmUserRepository,
    },
  ],
  exports: [USER_REPOSITORY, GetUserByIdUseCase],
})
export class UsersModule {}
