import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { ContactInput } from '../../domain/client-fiche.port';
import { REQUIRED, tooLong, trim, trimToNull } from './fiche-dto.helpers';

/** Corps de POST /clients/:id/contacts et PUT /clients/:id/contacts/:contactId. */
export class SaveContactRequestDto implements ContactInput {
  @ApiProperty({ enum: [1, 2], description: '1 = M., 2 = Mme.' })
  @IsIn([1, 2], { message: REQUIRED })
  civilite!: number;

  @ApiProperty({ example: 'DUPONT', description: 'Enregistré en majuscules.' })
  @Transform(trim)
  @IsString({ message: REQUIRED })
  @IsNotEmpty({ message: REQUIRED })
  @MaxLength(60, tooLong(60))
  nom!: string;

  @ApiPropertyOptional({ example: 'Jeanne', nullable: true, type: String })
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(39, tooLong(39))
  prenom: string | null = null;

  @ApiProperty({ example: 'Directeur', description: 'Libellé FONC.' })
  @Transform(trim)
  @IsString({ message: REQUIRED })
  @IsNotEmpty({ message: REQUIRED })
  @MaxLength(50, tooLong(50))
  poste!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(50, tooLong(50))
  telephone: string | null = null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @Transform(trimToNull)
  @IsOptional()
  @IsEmail({}, { message: "L'adresse e-mail n'est pas valide." })
  @MaxLength(255, tooLong(255))
  adresseEmail: string | null = null;

  @ApiProperty()
  @IsBoolean({ message: 'Le statut doit être un booléen.' })
  actif!: boolean;
}
