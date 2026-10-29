import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../domain/user';
import { UserRole } from '../../domain/user-role.enum';

/**
 * Représentation HTTP d'un utilisateur — contrat consommé par le front
 * d'administration. Ne contient JAMAIS le hash du mot de passe.
 */
export class UserResponseDto {
  @ApiProperty({ description: "Identifiant de l'utilisateur (UUID)." })
  id!: string;

  @ApiProperty({ example: 'admin@local.dev' })
  email!: string;

  @ApiProperty({ example: 'Administrateur local' })
  displayName!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.Employee })
  role!: UserRole;

  @ApiProperty({ description: 'Un compte inactif ne peut plus se connecter.' })
  isActive!: boolean;

  @ApiProperty({
    description: 'Dernière connexion (ISO 8601, UTC).',
    nullable: true,
    type: String,
  })
  lastLoginAt!: Date | null;

  @ApiProperty({ description: 'Création du compte (ISO 8601, UTC).' })
  createdAt!: Date;

  static fromDomain(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.displayName = user.displayName;
    dto.role = user.role;
    dto.isActive = user.isActive;
    dto.lastLoginAt = user.lastLoginAt;
    dto.createdAt = user.createdAt;
    return dto;
  }
}
