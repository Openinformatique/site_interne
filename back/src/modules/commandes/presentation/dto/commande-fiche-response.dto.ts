import { ApiProperty } from '@nestjs/swagger';
import type {
  CommandeDetail,
  CommandeDocument,
  CommandeTemps,
  PointageCommande,
  TempsPersonne,
} from '../../domain/commande-fiche.port';

/** Fiche commande — contrat consommé par le front. Dates en AAAA-MM-JJ. */
export class CommandeDetailResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() clientId!: number;
  @ApiProperty({ nullable: true, type: String, description: 'Raison sociale.' })
  client!: string | null;
  @ApiProperty() clientActif!: boolean;
  @ApiProperty({ nullable: true, type: Number })
  clientContratId!: number | null;
  @ApiProperty({ description: 'Clé TYPC.' }) typeCommande!: string;
  @ApiProperty({ nullable: true, type: String }) numeroDevis!: string | null;
  @ApiProperty() dateDevis!: string;
  @ApiProperty({ nullable: true, type: String })
  numeroCommandeClient!: string | null;
  @ApiProperty() dateCommande!: string;
  @ApiProperty() libelleCommande!: string;
  @ApiProperty() nbJoursCommande!: number;
  @ApiProperty() nbJoursPrevus!: number;
  @ApiProperty({ nullable: true, type: String }) delai!: string | null;
  @ApiProperty({ nullable: true, type: Number }) montant!: number | null;
  @ApiProperty({ nullable: true, type: String }) dateCloture!: string | null;
  @ApiProperty({ description: 'Des pointages sont rattachés à la commande.' })
  hasPointages!: boolean;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
  @ApiProperty({ nullable: true, type: String }) createdBy!: string | null;
  @ApiProperty({ nullable: true, type: String }) updatedBy!: string | null;

  static fromDomain(commande: CommandeDetail): CommandeDetailResponseDto {
    return Object.assign(new CommandeDetailResponseDto(), {
      ...commande,
      createdAt: commande.createdAt.toISOString(),
      updatedAt: commande.updatedAt.toISOString(),
    });
  }
}

export class TempsPersonneResponseDto {
  @ApiProperty({ nullable: true, type: String }) utilisateurId!: string | null;
  @ApiProperty({ nullable: true, type: String }) personne!: string | null;
  @ApiProperty({ description: 'Jours facturables pointés.' }) jours!: number;
  @ApiProperty({ nullable: true, type: String })
  dernierPointage!: string | null;
}

export class PointageCommandeResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true, type: String }) date!: string | null;
  @ApiProperty({ nullable: true, type: String }) personne!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Clé TYPA.' })
  typeAction!: string | null;
  @ApiProperty({ nullable: true, type: String })
  typeActionLibelle!: string | null;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty({ description: 'Jours facturables.' }) jours!: number;
}

/** Temps passé sur la commande : cumul par personne et détail des pointages. */
export class CommandeTempsResponseDto {
  @ApiProperty({ type: TempsPersonneResponseDto, isArray: true })
  personnes!: TempsPersonne[];
  @ApiProperty({ type: PointageCommandeResponseDto, isArray: true })
  pointages!: PointageCommande[];

  static fromDomain(temps: CommandeTemps): CommandeTempsResponseDto {
    return Object.assign(new CommandeTempsResponseDto(), temps);
  }
}

/** Document joint à une commande. */
export class CommandeDocumentResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true, type: String }) nomFichier!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Clé TDOC.' })
  typeDocument!: string | null;
  @ApiProperty({ nullable: true, type: String })
  typeDocumentLibelle!: string | null;
  @ApiProperty({ nullable: true, type: String }) commentaire!: string | null;
  @ApiProperty() typeMime!: string;
  @ApiProperty() tailleOctets!: number;
  @ApiProperty() createdAt!: string;

  static fromDomain(document: CommandeDocument): CommandeDocumentResponseDto {
    return Object.assign(new CommandeDocumentResponseDto(), {
      ...document,
      createdAt: document.createdAt.toISOString(),
    });
  }
}
