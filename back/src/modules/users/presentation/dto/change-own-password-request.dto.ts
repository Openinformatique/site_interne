import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';
import { PASSWORD_POLICY, PASSWORD_POLICY_MESSAGE } from './password-policy';

/** Corps de PATCH /users/me/password. */
export class ChangeOwnPasswordRequestDto {
  @ApiProperty({ description: 'Mot de passe actuel (vérifié avant tout).' })
  @IsString({ message: 'Le mot de passe actuel doit être une chaîne.' })
  @IsNotEmpty({ message: 'Le mot de passe actuel est requis.' })
  currentPassword!: string;

  @ApiProperty({ description: PASSWORD_POLICY_MESSAGE })
  @IsStrongPassword(PASSWORD_POLICY, { message: PASSWORD_POLICY_MESSAGE })
  newPassword!: string;
}
