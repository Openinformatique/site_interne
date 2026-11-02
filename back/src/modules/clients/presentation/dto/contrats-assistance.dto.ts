import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  INVALID_DATE,
  REQUIRED,
  trimToNull,
} from '../../../../common/utils/form-dto.helpers';
import type { ContratAssistance } from '../../domain/client-fiche.port';

const ENTIER = "L'identifiant doit être un entier.";

/** Paramètres de GET /contrats-assistance/edition.zip. */
export class EditionContratsQueryDto {
  @ApiProperty({
    description:
      "Date d'arrêté : contrats en cours à cette date, suivis arrêtés à cette date (incluse).",
    example: '2026-10-31',
  })
  @IsNotEmpty({ message: REQUIRED })
  @IsDateString({ strict: true }, { message: INVALID_DATE })
  arreteAu!: string;

  @ApiPropertyOptional({ description: 'Groupe (clé GSOC).', example: 'CFL' })
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(20)
  groupe?: string | null;

  @ApiPropertyOptional({ description: 'Client.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: ENTIER })
  @Min(1, { message: ENTIER })
  clientId?: number;

  @ApiPropertyOptional({ description: 'Contrat.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: ENTIER })
  @Min(1, { message: ENTIER })
  contratId?: number;
}

/** Contrat proposé dans la fenêtre « Édition des contrats d'assistance ». */
export class ContratAssistanceResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true, type: String })
  libelleContrat!: string | null;
  @ApiProperty({ nullable: true, type: String, example: '2024-05-01' })
  dateMiseEnPlace!: string | null;
  @ApiProperty({ nullable: true, type: String })
  dateEcheance!: string | null;
  @ApiProperty() clientId!: number;
  @ApiProperty() clientNom!: string;
  @ApiProperty({ nullable: true, type: String, description: 'Clé GSOC.' })
  groupe!: string | null;
  @ApiProperty({ nullable: true, type: String })
  groupeLibelle!: string | null;

  static fromDomain(contrat: ContratAssistance): ContratAssistanceResponseDto {
    return Object.assign(new ContratAssistanceResponseDto(), contrat);
  }
}
