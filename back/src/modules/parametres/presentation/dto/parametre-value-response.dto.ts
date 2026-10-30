import { ApiProperty } from '@nestjs/swagger';
import type { ParametreValue } from '../../domain/parametre-repository.port';

/** Valeur d'une table de paramètres exposée au front. */
export class ParametreValueResponseDto {
  @ApiProperty({ description: 'Clé du paramètre.', example: 'FR' })
  cle!: string;

  @ApiProperty({ description: 'Libellé (rubrique 01).', example: 'France' })
  libelle!: string;

  static fromDomain(value: ParametreValue): ParametreValueResponseDto {
    const dto = new ParametreValueResponseDto();
    dto.cle = value.cle;
    dto.libelle = value.libelle;
    return dto;
  }
}
