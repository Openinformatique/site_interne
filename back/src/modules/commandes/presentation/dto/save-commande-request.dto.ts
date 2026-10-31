import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  INVALID_DATE,
  REQUIRED,
  tooLong,
  trim,
  trimToNull,
} from '../../../../common/utils/form-dto.helpers';
import type { CommandeInput } from '../../domain/commande-fiche.port';

const JOURS_MESSAGE =
  'Nombre de jours invalide (positif, 4 décimales maximum).';
const MONTANT_MESSAGE = 'Montant invalide (positif, 2 décimales maximum).';
/** Plafond des colonnes decimal(9,4). */
const MAX_JOURS = 99999.9999;

/** Champ numérique : chaîne vide → null (puis « Champ obligatoire » si requis). */
const emptyToNull = ({ value }: { value: unknown }): unknown =>
  value === '' ? null : value;

/** Corps de POST /commandes et PUT /commandes/:id. */
export class SaveCommandeRequestDto implements CommandeInput {
  @ApiProperty({ example: 42 })
  @IsNotEmpty({ message: REQUIRED })
  @IsInt({ message: REQUIRED })
  clientId!: number;

  @ApiPropertyOptional({ nullable: true, type: Number })
  @IsOptional()
  @IsInt({ message: 'Contrat invalide.' })
  clientContratId: number | null = null;

  @ApiProperty({ description: 'Clé TYPC.', example: 'COM', maxLength: 20 })
  @Transform(trim)
  @IsString({ message: REQUIRED })
  @IsNotEmpty({ message: REQUIRED })
  @MaxLength(20, tooLong(20))
  typeCommande!: string;

  @ApiPropertyOptional({ nullable: true, type: String, maxLength: 10 })
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(10, tooLong(10))
  numeroDevis: string | null = null;

  @ApiProperty({ example: '2026-10-06' })
  @Transform(trimToNull)
  @IsNotEmpty({ message: REQUIRED })
  @IsISO8601({ strict: true }, { message: INVALID_DATE })
  dateDevis!: string;

  @ApiPropertyOptional({ nullable: true, type: String, maxLength: 20 })
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(20, tooLong(20))
  numeroCommandeClient: string | null = null;

  @ApiProperty({ example: '2026-10-20' })
  @Transform(trimToNull)
  @IsNotEmpty({ message: REQUIRED })
  @IsISO8601({ strict: true }, { message: INVALID_DATE })
  dateCommande!: string;

  @ApiProperty({ example: 'Migration SQL Server' })
  @Transform(trim)
  @IsString({ message: REQUIRED })
  @IsNotEmpty({ message: REQUIRED })
  @MaxLength(4000, tooLong(4000))
  libelleCommande!: string;

  @ApiProperty({ example: 37 })
  @Transform(emptyToNull)
  @IsNotEmpty({ message: REQUIRED })
  @IsNumber({ maxDecimalPlaces: 4 }, { message: JOURS_MESSAGE })
  @Min(0, { message: JOURS_MESSAGE })
  @Max(MAX_JOURS, { message: JOURS_MESSAGE })
  nbJoursCommande!: number;

  @ApiProperty({ example: 30 })
  @Transform(emptyToNull)
  @IsNotEmpty({ message: REQUIRED })
  @IsNumber({ maxDecimalPlaces: 4 }, { message: JOURS_MESSAGE })
  @Min(0, { message: JOURS_MESSAGE })
  @Max(MAX_JOURS, { message: JOURS_MESSAGE })
  nbJoursPrevus!: number;

  @ApiPropertyOptional({ nullable: true, type: String, example: '2027-03-31' })
  @Transform(trimToNull)
  @IsOptional()
  @IsISO8601({ strict: true }, { message: INVALID_DATE })
  delai: string | null = null;

  @ApiPropertyOptional({ nullable: true, type: Number, example: 24050 })
  @Transform(emptyToNull)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: MONTANT_MESSAGE })
  @Min(0, { message: MONTANT_MESSAGE })
  montant: number | null = null;

  @ApiPropertyOptional({ nullable: true, type: String, example: '2027-04-15' })
  @Transform(trimToNull)
  @IsOptional()
  @IsISO8601({ strict: true }, { message: INVALID_DATE })
  dateCloture: string | null = null;
}

/** Champs texte de POST /commandes/:id/documents (multipart, avec « file »). */
export class AddDocumentRequestDto {
  @ApiProperty({ description: 'Clé TDOC.', example: 'BCOM', maxLength: 20 })
  @Transform(trim)
  @IsString({ message: REQUIRED })
  @IsNotEmpty({ message: REQUIRED })
  @MaxLength(20, tooLong(20))
  typeDocument!: string;

  @ApiPropertyOptional({ nullable: true, type: String, maxLength: 100 })
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(100, tooLong(100))
  commentaire: string | null = null;
}
