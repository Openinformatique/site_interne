import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsISO8601, IsOptional } from 'class-validator';
import { INVALID_DATE, toBoolean } from './fiche-dto.helpers';

/** Paramètres de GET /clients/:id/commandes. */
export class ClientCommandesQueryDto {
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
}
