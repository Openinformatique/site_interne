import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { ResultatRecherche } from '../../domain/recherche.port';

/** Query de GET /recherche. */
export class RechercheQueryDto {
  @ApiProperty({
    example: 'corail',
    description: 'Mots recherchés (8 au plus).',
  })
  @IsString()
  @MaxLength(200)
  q!: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'Résultats par catégorie (1 à 200, 5 par défaut).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limite invalide.' })
  @Min(1)
  @Max(200)
  limite?: number;
}

class ClientTrouveDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true, type: String }) codeClient!: string | null;
  @ApiProperty({ nullable: true, type: String }) raisonSociale!: string | null;
  @ApiProperty({ nullable: true, type: String }) ville!: string | null;
  @ApiProperty({ nullable: true, type: String }) groupe!: string | null;
  @ApiProperty() actif!: boolean;
}

class CommandeTrouveeDto {
  @ApiProperty() id!: number;
  @ApiProperty() clientId!: number;
  @ApiProperty({ nullable: true, type: String }) codeClient!: string | null;
  @ApiProperty({ nullable: true, type: String }) client!: string | null;
  @ApiProperty({ nullable: true, type: String }) numeroCommande!: string | null;
  @ApiProperty({ nullable: true, type: String }) numeroDevis!: string | null;
  @ApiProperty({ nullable: true, type: String }) libelle!: string | null;
  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Libellé du contrat.',
  })
  contrat!: string | null;
  @ApiProperty({ nullable: true, type: String }) dateCommande!: string | null;
  @ApiProperty() cloturee!: boolean;
}

class PointageTrouveDto {
  @ApiProperty() id!: number;
  @ApiProperty() utilisateurId!: string;
  @ApiProperty({ nullable: true, type: String }) personne!: string | null;
  @ApiProperty() debut!: Date;
  @ApiProperty({ example: '2026-10-28', description: 'Jour à Paris.' })
  jour!: string;
  @ApiProperty({ nullable: true, type: String }) codeClient!: string | null;
  @ApiProperty({ nullable: true, type: String }) commande!: string | null;
  @ApiProperty({ nullable: true, type: String }) type!: string | null;
  @ApiProperty() heures!: number;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
}

class ClientsTrouvesDto {
  @ApiProperty() total!: number;
  @ApiProperty({ type: ClientTrouveDto, isArray: true })
  items!: ClientTrouveDto[];
}

class CommandesTrouveesDto {
  @ApiProperty() total!: number;
  @ApiProperty({ type: CommandeTrouveeDto, isArray: true })
  items!: CommandeTrouveeDto[];
}

class PointagesTrouvesDto {
  @ApiProperty() total!: number;
  @ApiProperty({
    description: 'Total des heures de tous les pointages trouvés.',
  })
  heures!: number;
  @ApiProperty({ type: PointageTrouveDto, isArray: true })
  items!: PointageTrouveDto[];
}

export class ResultatRechercheResponseDto {
  @ApiProperty({ type: String, isArray: true }) termes!: string[];
  @ApiProperty({ type: ClientsTrouvesDto }) clients!: ClientsTrouvesDto;
  @ApiProperty({ type: CommandesTrouveesDto }) commandes!: CommandesTrouveesDto;
  @ApiProperty({ type: PointagesTrouvesDto }) pointages!: PointagesTrouvesDto;

  static fromDomain(resultat: ResultatRecherche): ResultatRechercheResponseDto {
    return Object.assign(new ResultatRechercheResponseDto(), resultat);
  }
}
