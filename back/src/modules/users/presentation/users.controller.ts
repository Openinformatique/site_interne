import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ValidationException } from '../../../common/exceptions/app-exceptions';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user';
import { PaginatedResult } from '../../../common/pagination/paginated-result';
import { ChangeOwnPasswordUseCase } from '../application/change-own-password.use-case';
import { ChangeUserRoleUseCase } from '../application/change-user-role.use-case';
import { CreateUserUseCase } from '../application/create-user.use-case';
import { DeactivateUserUseCase } from '../application/deactivate-user.use-case';
import { GetUserByIdUseCase } from '../application/get-user-by-id.use-case';
import { ListUsersUseCase } from '../application/list-users.use-case';
import { ReactivateUserUseCase } from '../application/reactivate-user.use-case';
import { UserRole } from '../domain/user-role.enum';
import { ChangeOwnPasswordRequestDto } from './dto/change-own-password-request.dto';
import { CreateUserRequestDto } from './dto/create-user-request.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserRoleRequestDto } from './dto/update-user-role-request.dto';
import { UserResponseDto } from './dto/user-response.dto';

/** Pipe UUID avec erreur au format standard (VALIDATION_ERROR, français). */
const uuidPipe = new ParseUUIDPipe({
  exceptionFactory: () =>
    new ValidationException([
      { field: 'id', message: "L'identifiant doit être un UUID valide." },
    ]),
});

/**
 * Gestion des utilisateurs — contrat consommé par le front d'administration.
 *
 * Toutes les routes exigent un Bearer valide (guard global) ; les routes
 * d'administration sont de plus restreintes par rôle via @Roles (claim
 * role de l'access token, appliqué par RolesGuard : refus → 403
 * ACCESS_DENIED). Les routes /me sont déclarées AVANT /:id pour ne pas
 * être capturées par le paramètre.
 */
@ApiTags('Utilisateurs')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly getUserById: GetUserByIdUseCase,
    private readonly listUsers: ListUsersUseCase,
    private readonly createUser: CreateUserUseCase,
    private readonly changeUserRole: ChangeUserRoleUseCase,
    private readonly deactivateUser: DeactivateUserUseCase,
    private readonly reactivateUser: ReactivateUserUseCase,
    private readonly changeOwnPassword: ChangeOwnPasswordUseCase,
  ) {}

  @Get('me')
  @ApiOperation({ summary: "Profil complet de l'utilisateur connecté" })
  @ApiOkResponse({ type: UserResponseDto })
  async getMe(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const profile = await this.getUserById.execute(user.userId);
    return UserResponseDto.fromDomain(profile);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Changer son propre mot de passe' })
  @ApiNoContentResponse({ description: 'Mot de passe modifié.' })
  @ApiConflictResponse({
    description: 'Mot de passe actuel incorrect (BUSINESS_RULE_VIOLATION).',
  })
  async changeMyPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ChangeOwnPasswordRequestDto,
  ): Promise<void> {
    await this.changeOwnPassword.execute(
      user.userId,
      body.currentPassword,
      body.newPassword,
    );
  }

  @Get()
  @Roles(UserRole.Admin, UserRole.Direction)
  @ApiOperation({ summary: 'Liste paginée des utilisateurs' })
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  @ApiForbiddenResponse({ description: 'Rôle insuffisant (ACCESS_DENIED).' })
  async list(
    @Query() query: ListUsersQueryDto,
  ): Promise<PaginatedResult<UserResponseDto>> {
    const result = await this.listUsers.execute(query);
    return {
      items: result.items.map((user) => UserResponseDto.fromDomain(user)),
      meta: result.meta,
    };
  }

  @Post()
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Créer un utilisateur' })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiConflictResponse({
    description: 'E-mail déjà utilisé (RESOURCE_ALREADY_EXISTS).',
  })
  @ApiForbiddenResponse({ description: 'Rôle insuffisant (ACCESS_DENIED).' })
  async create(
    @Body() body: CreateUserRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const user = await this.createUser.execute(body, actor.userId);
    return UserResponseDto.fromDomain(user);
  }

  @Get(':id')
  @Roles(UserRole.Admin, UserRole.Direction)
  @ApiOperation({ summary: 'Détail d’un utilisateur' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({
    description: 'Utilisateur inconnu (RESOURCE_NOT_FOUND).',
  })
  @ApiForbiddenResponse({ description: 'Rôle insuffisant (ACCESS_DENIED).' })
  async getById(@Param('id', uuidPipe) id: string): Promise<UserResponseDto> {
    const user = await this.getUserById.execute(id);
    return UserResponseDto.fromDomain(user);
  }

  @Patch(':id/role')
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Changer le rôle d’un utilisateur' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiConflictResponse({
    description:
      'Propre compte ou dernier administrateur actif (BUSINESS_RULE_VIOLATION).',
  })
  @ApiForbiddenResponse({ description: 'Rôle insuffisant (ACCESS_DENIED).' })
  async updateRole(
    @Param('id', uuidPipe) id: string,
    @Body() body: UpdateUserRoleRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const user = await this.changeUserRole.execute(id, body.role, actor.userId);
    return UserResponseDto.fromDomain(user);
  }

  @Delete(':id')
  @Roles(UserRole.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Désactiver un utilisateur (soft : is_active=false)',
  })
  @ApiNoContentResponse({ description: 'Compte désactivé.' })
  @ApiConflictResponse({
    description: 'Propre compte (BUSINESS_RULE_VIOLATION).',
  })
  @ApiForbiddenResponse({ description: 'Rôle insuffisant (ACCESS_DENIED).' })
  async deactivate(
    @Param('id', uuidPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.deactivateUser.execute(id, actor.userId);
  }

  @Patch(':id/reactivate')
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Réactiver un utilisateur (idempotent)' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiForbiddenResponse({ description: 'Rôle insuffisant (ACCESS_DENIED).' })
  async reactivate(
    @Param('id', uuidPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const user = await this.reactivateUser.execute(id, actor.userId);
    return UserResponseDto.fromDomain(user);
  }
}
