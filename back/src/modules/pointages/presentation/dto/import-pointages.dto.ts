import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import type { ResultatImport } from '../../application/import-pointages.use-case';

/** Champs (multipart) de POST /pointages/import et /pointages/import/verification. */
export class ImportPointagesRequestDto {
  @ApiProperty({ description: 'Personne à qui les pointages sont attribués.' })
  @IsUUID('all', { message: 'Personne invalide.' })
  utilisateurId!: string;
}

export class ControleColonneDto {
  @ApiProperty({ example: 'D' }) lettre!: string;
  @ApiProperty({
    example: 'Devis',
    description: 'Vide pour une colonne en trop.',
  })
  attendu!: string;
  @ApiProperty({ nullable: true, type: String }) lu!: string | null;
  @ApiProperty() conforme!: boolean;
}

export class ControleFormatDto {
  @ApiProperty() conforme!: boolean;
  @ApiProperty({ type: ControleColonneDto, isArray: true })
  colonnes!: ControleColonneDto[];
}

export class ErreurImportDto {
  @ApiProperty({
    nullable: true,
    type: Number,
    description: 'Ligne Excel (null : tout le fichier).',
  })
  ligne!: number | null;
  @ApiProperty({ nullable: true, type: String, example: 'D – Devis' })
  colonne!: string | null;
  @ApiProperty({ nullable: true, type: String }) valeur!: string | null;
  @ApiProperty() message!: string;
}

export class TagImporteDto {
  @ApiProperty() libelle!: string;
  @ApiProperty({ description: 'Tag du paramétrage (sinon tag libre).' })
  parametre!: boolean;
}

export class PointageImporteDto {
  @ApiProperty() ligne!: number;
  @ApiProperty({ example: '2026-10-26' }) jour!: string;
  @ApiProperty({ example: '07:00' }) debut!: string;
  @ApiProperty({ example: '07:30' }) fin!: string;
  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Code client (null : interne).',
  })
  client!: string | null;
  @ApiProperty() type!: string;
  @ApiProperty({ nullable: true, type: String }) commande!: string | null;
  @ApiProperty({ nullable: true, type: String }) contact!: string | null;
  @ApiProperty({ type: TagImporteDto, isArray: true }) tags!: TagImporteDto[];
  @ApiProperty() description!: string;
  @ApiProperty() heures!: number;
}

export class ResultatImportDto {
  @ApiProperty({
    type: ControleFormatDto,
    nullable: true,
    description: 'null : fichier illisible.',
  })
  format!: ControleFormatDto | null;
  @ApiProperty({ type: ErreurImportDto, isArray: true })
  erreurs!: ErreurImportDto[];
  @ApiProperty({ type: PointageImporteDto, isArray: true })
  pointages!: PointageImporteDto[];
  @ApiProperty({
    description: 'Pointages créés (0 : vérification ou fichier en erreur).',
  })
  importes!: number;

  static fromDomain(resultat: ResultatImport): ResultatImportDto {
    return Object.assign(new ResultatImportDto(), resultat);
  }
}
