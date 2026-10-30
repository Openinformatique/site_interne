import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';
import { CLIENT_SORT_FIELDS } from '../../domain/client-repository.port';
import type { ClientSortField } from '../../domain/client-repository.port';

/** Query string : "true" / "false" convertis en booléens. */
const toBoolean = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

/**
 * Paramètres de GET /clients : pagination/tri/recherche communs du socle,
 * plus le statut et les groupes.
 */
export class ListClientsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Colonne de tri.',
    enum: CLIENT_SORT_FIELDS,
    default: 'raisonSociale',
  })
  @IsOptional()
  @IsIn(CLIENT_SORT_FIELDS, {
    message: `Le paramètre "sortBy" doit valoir : ${CLIENT_SORT_FIELDS.join(', ')}.`,
  })
  // Redéfinit le champ du socle pour restreindre les colonnes de tri.
  override sortBy?: ClientSortField = undefined;

  @ApiPropertyOptional({
    description:
      'Inclure les clients inactifs ("true" / "false", défaut : false).',
    type: Boolean,
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({
    message: 'Le paramètre "includeInactive" doit valoir "true" ou "false".',
  })
  includeInactive?: boolean;

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
    description: 'Inclure les clients sans groupe ("true" / "false").',
    type: Boolean,
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({
    message: 'Le paramètre "sansGroupe" doit valoir "true" ou "false".',
  })
  sansGroupe?: boolean;
}
