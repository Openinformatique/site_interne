import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';
import { COMMANDE_SORT_FIELDS } from '../../domain/commande-list.port';
import type { CommandeSortField } from '../../domain/commande-list.port';

/** Query string : "true" / "false" convertis en booléens. */
const toBoolean = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

const INVALID_DATE = 'Date invalide (AAAA-MM-JJ).';

/**
 * Paramètres de GET /commandes et de GET /commandes/export (qui ignore la
 * pagination) : tri, recherche, clôturées, période, client et groupes.
 */
export class ListCommandesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Colonne de tri.',
    enum: COMMANDE_SORT_FIELDS,
    default: 'client',
  })
  @IsOptional()
  @IsIn(COMMANDE_SORT_FIELDS, {
    message: `Le paramètre "sortBy" doit valoir : ${COMMANDE_SORT_FIELDS.join(', ')}.`,
  })
  // Redéfinit le champ du socle pour restreindre les colonnes de tri.
  override sortBy?: CommandeSortField = undefined;

  @ApiPropertyOptional({
    description:
      'Inclure les commandes clôturées ("true" / "false", défaut : false).',
    type: Boolean,
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({
    message: 'Le paramètre "includeClosed" doit valoir "true" ou "false".',
  })
  includeClosed?: boolean;

  @ApiPropertyOptional({
    description: 'Début de période (date du devis ou de commande).',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: INVALID_DATE })
  du?: string;

  @ApiPropertyOptional({
    description: 'Fin de période (date du devis ou de commande).',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: INVALID_DATE })
  au?: string;

  @ApiPropertyOptional({ description: 'Identifiant du client.', type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Le paramètre "clientId" doit être un entier.' })
  @Min(1, {
    message: 'Le paramètre "clientId" doit être supérieur ou égal à 1.',
  })
  clientId?: number;

  @ApiPropertyOptional({
    description: 'Groupes (clés GSOC) séparés par des virgules, ex. "CFL".',
    type: String,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((groupe) => groupe.trim())
          .filter(Boolean)
      : value,
  )
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  groupes?: string[];

  @ApiPropertyOptional({
    description: 'Inclure les commandes des clients sans groupe.',
    type: Boolean,
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({
    message: 'Le paramètre "sansGroupe" doit valoir "true" ou "false".',
  })
  sansGroupe?: boolean;
}
