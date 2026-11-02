import { ApiProperty } from '@nestjs/swagger';
import type { CongesDuTableau } from '../../application/tableau-de-bord.use-case';
import type {
  CommandeALivrer,
  ContratARenouveler,
} from '../../domain/tableau-de-bord.port';

/** Contrat de plus d'1 h de crédit dont il reste 1 h ou moins. */
export class ContratARenouvelerResponseDto {
  @ApiProperty() contratId!: number;
  @ApiProperty({ nullable: true, type: String })
  libelleContrat!: string | null;
  @ApiProperty({ nullable: true, type: String, example: '2026-12-31' })
  dateEcheance!: string | null;
  @ApiProperty({
    nullable: true,
    type: Number,
    description: "Jours jusqu'à l'échéance (0 = aujourd'hui).",
  })
  joursAvantEcheance!: number | null;
  @ApiProperty() clientId!: number;
  @ApiProperty({ nullable: true, type: String }) codeClient!: string | null;
  @ApiProperty({ nullable: true, type: String }) raisonSociale!: string | null;
  @ApiProperty({ description: 'Heures créditées.' }) credit!: number;
  @ApiProperty({ description: 'Heures débitées.' }) debit!: number;
  @ApiProperty({ description: 'Heures restantes (peut être négatif).' })
  restant!: number;
  @ApiProperty({ description: 'Débit ÷ crédit (1 = 100 %).', example: 0.97 })
  consommation!: number;

  static fromDomain(
    contrat: ContratARenouveler,
  ): ContratARenouvelerResponseDto {
    return Object.assign(new ContratARenouvelerResponseDto(), contrat);
  }
}

/** Commande non clôturée en retard ou à livrer dans les 2 semaines. */
export class CommandeALivrerResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() clientId!: number;
  @ApiProperty({ nullable: true, type: String }) codeClient!: string | null;
  @ApiProperty({ nullable: true, type: String }) raisonSociale!: string | null;
  @ApiProperty({ nullable: true, type: String }) libelle!: string | null;
  @ApiProperty({ nullable: true, type: String })
  numeroCommande!: string | null;
  @ApiProperty({ nullable: true, type: String }) numeroDevis!: string | null;
  @ApiProperty({ example: '2026-11-09' }) delai!: string;
  @ApiProperty({
    description: "Jours jusqu'au délai : négatif = retard, 0 = aujourd'hui.",
  })
  joursAvantDelai!: number;
  @ApiProperty({ nullable: true, type: Number })
  joursCommandes!: number | null;
  @ApiProperty() joursPasses!: number;

  static fromDomain(commande: CommandeALivrer): CommandeALivrerResponseDto {
    return Object.assign(new CommandeALivrerResponseDto(), commande);
  }
}

const DUREES = ['JOURNEE', 'MATIN', 'APRES_MIDI'];

export class JourDeCongeDto {
  @ApiProperty({ example: '2026-11-13' }) jour!: string;
  @ApiProperty({ enum: DUREES }) duree!: string;
}

export class CongeResponseDto {
  @ApiProperty() utilisateurId!: string;
  @ApiProperty() nom!: string;
  @ApiProperty({ type: JourDeCongeDto }) debut!: JourDeCongeDto;
  @ApiProperty({ type: JourDeCongeDto }) fin!: JourDeCongeDto;
  @ApiProperty({ description: 'Durée totale (demi-journée = 0,5).' })
  nbJours!: number;
  @ApiProperty({
    type: JourDeCongeDto,
    isArray: true,
    description: 'Jours de congé dans la fenêtre.',
  })
  jours!: JourDeCongeDto[];
  @ApiProperty({
    type: String,
    isArray: true,
    description: 'Fériés de la personne dans la fenêtre.',
  })
  feries!: string[];
  @ApiProperty({ description: 'Négatif : congé en cours.' })
  joursAvantDebut!: number;
  @ApiProperty() absentAujourdhui!: boolean;
  @ApiProperty({ type: JourDeCongeDto }) retour!: JourDeCongeDto;
}

export class CongesResponseDto {
  @ApiProperty({ description: 'Premier jour de la fenêtre.' }) du!: string;
  @ApiProperty({ description: 'Dernier jour de la fenêtre.' }) au!: string;
  @ApiProperty() aujourdhui!: string;
  @ApiProperty({ type: CongeResponseDto, isArray: true })
  conges!: CongeResponseDto[];

  static fromDomain(conges: CongesDuTableau): CongesResponseDto {
    return Object.assign(new CongesResponseDto(), conges);
  }
}
