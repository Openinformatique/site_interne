import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { ClientInput } from '../../domain/client-fiche.port';
import { REQUIRED, tooLong, trim, trimToNull } from './fiche-dto.helpers';

/** Corps de POST /clients et PUT /clients/:id. */
export class SaveClientRequestDto implements ClientInput {
  @ApiProperty({
    example: 'ALTEA',
    maxLength: 15,
    description: 'Enregistré en majuscules ; unique (casse ignorée).',
  })
  @Transform(trim)
  @IsString({ message: REQUIRED })
  @IsNotEmpty({ message: REQUIRED })
  @MaxLength(15, tooLong(15))
  codeClient!: string;

  @ApiProperty({ example: 'ALTEA SOLUTIONS', maxLength: 50 })
  @Transform(trim)
  @IsString({ message: REQUIRED })
  @IsNotEmpty({ message: REQUIRED })
  @MaxLength(50, tooLong(50))
  raisonSociale!: string;

  @ApiProperty()
  @IsBoolean({ message: 'Le statut doit être un booléen.' })
  actif!: boolean;

  @ApiPropertyOptional({ maxLength: 35, nullable: true, type: String })
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(35, tooLong(35))
  adresse1: string | null = null;

  @ApiPropertyOptional({ maxLength: 35, nullable: true, type: String })
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(35, tooLong(35))
  adresse2: string | null = null;

  @ApiPropertyOptional({ maxLength: 35, nullable: true, type: String })
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(35, tooLong(35))
  adresse3: string | null = null;

  @ApiProperty({ example: '57070', maxLength: 6 })
  @Transform(trim)
  @IsString({ message: REQUIRED })
  @IsNotEmpty({ message: REQUIRED })
  @MaxLength(6, tooLong(6))
  codePostal!: string;

  @ApiProperty({ example: 'METZ', maxLength: 30 })
  @Transform(trim)
  @IsString({ message: REQUIRED })
  @IsNotEmpty({ message: REQUIRED })
  @MaxLength(30, tooLong(30))
  ville!: string;

  @ApiProperty({ example: 'FR', maxLength: 3, description: 'Clé PAYS.' })
  @Transform(trim)
  @IsString({ message: REQUIRED })
  @IsNotEmpty({ message: REQUIRED })
  @MaxLength(3, tooLong(3))
  codePays!: string;

  @ApiPropertyOptional({
    maxLength: 20,
    nullable: true,
    type: String,
    description: 'Clé GSOC.',
  })
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(20, tooLong(20))
  groupe: string | null = null;

  @ApiPropertyOptional({ maxLength: 16, nullable: true, type: String })
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(16, tooLong(16))
  numeroTva: string | null = null;

  @ApiPropertyOptional({
    maxLength: 20,
    nullable: true,
    type: String,
    description: 'Clé REGL.',
  })
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(20, tooLong(20))
  modeReglement: string | null = null;
}
