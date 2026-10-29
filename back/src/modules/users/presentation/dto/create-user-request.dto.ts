import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
  MaxLength,
} from 'class-validator';
import { UserRole } from '../../domain/user-role.enum';
import { PASSWORD_POLICY, PASSWORD_POLICY_MESSAGE } from './password-policy';

/** Corps de POST /users (création par un administrateur). */
export class CreateUserRequestDto {
  @ApiProperty({ example: 'nouvel.utilisateur@example.com', maxLength: 320 })
  @IsEmail({}, { message: "L'adresse e-mail n'est pas valide." })
  @MaxLength(320, {
    message: "L'adresse e-mail ne peut pas dépasser 320 caractères.",
  })
  email!: string;

  @ApiProperty({ description: PASSWORD_POLICY_MESSAGE })
  @IsStrongPassword(PASSWORD_POLICY, { message: PASSWORD_POLICY_MESSAGE })
  password!: string;

  @ApiProperty({ example: 'Jean Dupont', minLength: 1, maxLength: 200 })
  @IsString({ message: "Le nom d'affichage doit être une chaîne." })
  @IsNotEmpty({ message: "Le nom d'affichage est requis." })
  @MaxLength(200, {
    message: "Le nom d'affichage ne peut pas dépasser 200 caractères.",
  })
  displayName!: string;

  @ApiPropertyOptional({
    enum: UserRole,
    default: UserRole.Employee,
    description: 'Rôle applicatif (EMPLOYEE si absent).',
  })
  @IsOptional()
  @IsEnum(UserRole, {
    message: 'Le rôle doit valoir ADMIN, DIRECTION ou EMPLOYEE.',
  })
  role: UserRole = UserRole.Employee;
}
