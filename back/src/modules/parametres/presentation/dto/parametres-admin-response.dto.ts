import { ApiProperty } from '@nestjs/swagger';
import type {
  Parametre,
  TableParametres,
} from '../../domain/parametre-admin.port';

export class RubriqueResponseDto {
  @ApiProperty({ example: '01' }) num!: string;
  @ApiProperty() nom!: string;
  @ApiProperty() aide!: string;
  @ApiProperty({ description: 'Nombre de valeurs renseignées.' })
  nbValeurs!: number;
}

/** Table de paramètres et ses rubriques (écran Paramètres). */
export class TableParametresResponseDto {
  @ApiProperty({ example: 'TYPA' }) code!: string;
  @ApiProperty() nom!: string;
  @ApiProperty() nomCle!: string;
  @ApiProperty() tailleCle!: number;
  @ApiProperty() aide!: string;
  @ApiProperty() codeDansCombo!: boolean;
  @ApiProperty({ type: RubriqueResponseDto, isArray: true })
  rubriques!: RubriqueResponseDto[];
  @ApiProperty() nbParametres!: number;

  static fromDomain(table: TableParametres): TableParametresResponseDto {
    return Object.assign(new TableParametresResponseDto(), table);
  }
}

/** Paramètre : clé, statut et valeurs par numéro de rubrique. */
export class ParametreResponseDto {
  @ApiProperty() cle!: string;
  @ApiProperty() actif!: boolean;
  @ApiProperty({ example: { '01': 'Assistance sur contrat' } })
  valeurs!: Record<string, string>;

  static fromDomain(parametre: Parametre): ParametreResponseDto {
    return Object.assign(new ParametreResponseDto(), parametre);
  }
}
