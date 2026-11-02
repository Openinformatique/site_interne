import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import {
  INVALID_DATE,
  REQUIRED,
  toBoolean,
  trimToNull,
} from '../../../../common/utils/form-dto.helpers';

const ENTIER = "L'identifiant doit être un entier.";

/** « a,b » ou ?tags=a&tags=b → liste sans vide. */
const toListe = ({ value }: { value: unknown }): unknown => {
  const brut = Array.isArray(value)
    ? value
    : value === undefined
      ? []
      : [value];
  return brut
    .flatMap((v) => String(v).split(','))
    .map((v) => v.trim())
    .filter(Boolean);
};

/** Paramètres de GET /pointages/export-cfl.pdf. */
export class ExportCflQueryDto {
  @ApiProperty({
    description: 'Début de période (jour à Paris).',
    example: '2026-10-01',
  })
  @IsNotEmpty({ message: REQUIRED })
  @IsDateString({ strict: true }, { message: INVALID_DATE })
  du!: string;

  @ApiProperty({
    description: 'Fin de période incluse.',
    example: '2026-10-31',
  })
  @IsNotEmpty({ message: REQUIRED })
  @IsDateString({ strict: true }, { message: INVALID_DATE })
  au!: string;

  @ApiProperty({ description: 'Client (obligatoire).' })
  @Type(() => Number)
  @IsInt({ message: ENTIER })
  @Min(1, { message: ENTIER })
  clientId!: number;

  @ApiPropertyOptional({ description: 'Commande du client.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: ENTIER })
  @Min(1, { message: ENTIER })
  commandeId?: number;

  @ApiPropertyOptional({
    description:
      'Personne (Admin / Direction ; les autres profils : eux-mêmes).',
  })
  @IsOptional()
  @Transform(trimToNull)
  @IsUUID('all', { message: 'Identifiant de personne invalide.' })
  utilisateurId?: string | null;

  @ApiPropertyOptional({ description: "Type d'action (clé TYPA)." })
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(20)
  typeAction?: string | null;

  @ApiPropertyOptional({
    description: 'Tags (au moins un) : « a,b » ou paramètre répété.',
    type: [String],
  })
  @IsOptional()
  @Transform(toListe)
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Uniquement les pointages sans tag ("true" / "false").',
    type: Boolean,
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({
    message: 'Le paramètre "sansTag" doit valoir "true" ou "false".',
  })
  sansTag?: boolean;
}
