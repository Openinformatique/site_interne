import { ApiProperty } from '@nestjs/swagger';
import type {
  ClientDetail,
  CommandeSummary,
  Contact,
  ContratMouvement,
  ContratSummary,
} from '../../domain/client-fiche.port';

/** Fiche client complète, avec sa traçabilité. */
export class ClientDetailResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true, type: String }) codeClient!: string | null;
  @ApiProperty({ nullable: true, type: String }) raisonSociale!: string | null;
  @ApiProperty() actif!: boolean;
  @ApiProperty({ nullable: true, type: String }) adresse1!: string | null;
  @ApiProperty({ nullable: true, type: String }) adresse2!: string | null;
  @ApiProperty({ nullable: true, type: String }) adresse3!: string | null;
  @ApiProperty({ nullable: true, type: String }) codePostal!: string | null;
  @ApiProperty({ nullable: true, type: String }) ville!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Clé PAYS.' })
  codePays!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Clé GSOC.' })
  groupe!: string | null;
  @ApiProperty({ nullable: true, type: String }) numeroTva!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Clé REGL.' })
  modeReglement!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({
    nullable: true,
    type: String,
    description: "Nom de l'auteur ; null pour les données reprises.",
  })
  createdBy!: string | null;
  @ApiProperty({ nullable: true, type: String }) updatedBy!: string | null;

  static fromDomain(client: ClientDetail): ClientDetailResponseDto {
    return Object.assign(new ClientDetailResponseDto(), client);
  }
}

/** Contrat avec son suivi en heures. */
export class ContratResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true, type: String }) libelleContrat!: string | null;
  @ApiProperty({ nullable: true, type: String, example: '2026-01-01' })
  dateMiseEnPlace!: string | null;
  @ApiProperty({ nullable: true, type: String, example: '2026-12-31' })
  dateEcheance!: string | null;
  @ApiProperty({ description: 'Heures créditées (jours commandés × HJOUR).' })
  credit!: number;
  @ApiProperty({ description: 'Heures pointées sur les commandes du contrat.' })
  debit!: number;
  @ApiProperty({ description: 'Crédit − débit (heures).' })
  restant!: number;

  static fromDomain(contrat: ContratSummary): ContratResponseDto {
    return Object.assign(new ContratResponseDto(), contrat);
  }
}

/** Mouvement du suivi d'un contrat. */
export class ContratMouvementResponseDto {
  @ApiProperty({ enum: ['COMMANDE', 'POINTAGE'] })
  type!: 'COMMANDE' | 'POINTAGE';
  @ApiProperty({ nullable: true, type: String }) date!: string | null;
  @ApiProperty() libelle!: string;
  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Login du salarié.',
  })
  utilisateur!: string | null;
  @ApiProperty() credit!: number;
  @ApiProperty() debit!: number;

  static fromDomain(mouvement: ContratMouvement): ContratMouvementResponseDto {
    return Object.assign(new ContratMouvementResponseDto(), mouvement);
  }
}

/** Contact d'un client. */
export class ContactResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty({ description: '1 = M., 2 = Mme, 0 = non renseignée.' })
  civilite!: number;
  @ApiProperty() nom!: string;
  @ApiProperty({ nullable: true, type: String }) prenom!: string | null;
  @ApiProperty() poste!: string;
  @ApiProperty({ nullable: true, type: String }) telephone!: string | null;
  @ApiProperty({ nullable: true, type: String }) adresseEmail!: string | null;
  @ApiProperty() actif!: boolean;

  static fromDomain(contact: Contact): ContactResponseDto {
    return Object.assign(new ContactResponseDto(), contact);
  }
}

/** Commande affichée dans la fiche client. */
export class ClientCommandeResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true, type: String }) numeroCommande!: string | null;
  @ApiProperty({ nullable: true, type: String }) numeroDevis!: string | null;
  @ApiProperty({ nullable: true, type: String }) dateDevis!: string | null;
  @ApiProperty({ nullable: true, type: String }) dateCommande!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Clé TYPC.' })
  typeCommande!: string | null;
  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Libellé du contrat.',
  })
  contrat!: string | null;
  @ApiProperty({ nullable: true, type: String }) delai!: string | null;
  @ApiProperty({ nullable: true, type: Number }) joursPrevus!: number | null;
  @ApiProperty({ description: 'Heures pointées ÷ HJOUR.' })
  joursPasses!: number;
  @ApiProperty({ nullable: true, type: String }) libelle!: string | null;
  @ApiProperty({ nullable: true, type: String }) dateCloture!: string | null;

  static fromDomain(commande: CommandeSummary): ClientCommandeResponseDto {
    return Object.assign(new ClientCommandeResponseDto(), commande);
  }
}
