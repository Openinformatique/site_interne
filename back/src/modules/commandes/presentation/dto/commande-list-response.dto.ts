import { ApiProperty } from '@nestjs/swagger';
import type {
  CommandeClientOption,
  CommandeListItem,
} from '../../domain/commande-list.port';

/** Ligne de la liste des commandes — contrat consommé par le front. */
export class CommandeListItemResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() clientId!: number;
  @ApiProperty({ nullable: true, type: String }) codeClient!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Raison sociale.' })
  client!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Clé GSOC.' })
  groupe!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Libellé GSOC.' })
  groupeLibelle!: string | null;
  @ApiProperty({ nullable: true, type: String }) dateCommande!: string | null;
  @ApiProperty({ nullable: true, type: String }) numeroCommande!: string | null;
  @ApiProperty({ nullable: true, type: String }) numeroDevis!: string | null;
  @ApiProperty({ nullable: true, type: String }) dateDevis!: string | null;
  @ApiProperty({ nullable: true, type: String }) delai!: string | null;
  @ApiProperty({ nullable: true, type: String }) libelle!: string | null;
  @ApiProperty({ nullable: true, type: Number }) joursPrevus!: number | null;
  @ApiProperty({ description: 'Heures pointées ÷ HJOUR.' })
  joursPasses!: number;
  @ApiProperty({ nullable: true, type: Number })
  joursCommandes!: number | null;
  @ApiProperty({ nullable: true, type: Number }) montant!: number | null;
  @ApiProperty({ nullable: true, type: String }) dateCloture!: string | null;

  static fromDomain(commande: CommandeListItem): CommandeListItemResponseDto {
    return Object.assign(new CommandeListItemResponseDto(), commande);
  }
}

/** Client proposé dans le filtre « Client » de la liste des commandes. */
export class CommandeClientOptionResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true, type: String }) codeClient!: string | null;
  @ApiProperty({ nullable: true, type: String }) raisonSociale!: string | null;

  static fromDomain(
    client: CommandeClientOption,
  ): CommandeClientOptionResponseDto {
    return Object.assign(new CommandeClientOptionResponseDto(), client);
  }
}
