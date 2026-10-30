import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { ContratInput } from '../../domain/client-fiche.port';
import {
  INVALID_DATE,
  REQUIRED,
  tooLong,
  trim,
  trimToNull,
} from './fiche-dto.helpers';

/** Corps de POST /clients/:id/contrats et PUT /clients/:id/contrats/:contratId. */
export class SaveContratRequestDto implements ContratInput {
  @ApiProperty({ example: 'Maintenance 2026', maxLength: 250 })
  @Transform(trim)
  @IsString({ message: REQUIRED })
  @IsNotEmpty({ message: REQUIRED })
  @MaxLength(250, tooLong(250))
  libelleContrat!: string;

  @ApiProperty({ example: '2026-01-01' })
  @Transform(trimToNull)
  @IsNotEmpty({ message: REQUIRED })
  @IsISO8601({ strict: true }, { message: INVALID_DATE })
  dateMiseEnPlace!: string;

  @ApiPropertyOptional({ example: '2026-12-31', nullable: true, type: String })
  @Transform(trimToNull)
  @IsOptional()
  @IsISO8601({ strict: true }, { message: INVALID_DATE })
  dateEcheance: string | null = null;
}
