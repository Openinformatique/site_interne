import { ApiProperty } from '@nestjs/swagger';
import type { ClientSummary } from '../../domain/client-repository.port';

/** Ligne de la liste des clients — contrat consommé par le front. */
export class ClientSummaryResponseDto {
  @ApiProperty({ example: 42 })
  id!: number;

  @ApiProperty({ example: 'ALTEA', nullable: true, type: String })
  codeClient!: string | null;

  @ApiProperty({ example: 'ALTEA SOLUTIONS', nullable: true, type: String })
  raisonSociale!: string | null;

  @ApiProperty({
    description: 'Clé GSOC.',
    example: 'CFL',
    nullable: true,
    type: String,
  })
  groupe!: string | null;

  @ApiProperty()
  actif!: boolean;

  @ApiProperty({ nullable: true, type: String })
  adresse1!: string | null;

  @ApiProperty({ nullable: true, type: String })
  adresse2!: string | null;

  @ApiProperty({ nullable: true, type: String })
  adresse3!: string | null;

  @ApiProperty({ example: '57070', nullable: true, type: String })
  codePostal!: string | null;

  @ApiProperty({ example: 'METZ', nullable: true, type: String })
  ville!: string | null;

  @ApiProperty({
    description: 'Clé PAYS.',
    example: 'FR',
    nullable: true,
    type: String,
  })
  codePays!: string | null;

  static fromDomain(client: ClientSummary): ClientSummaryResponseDto {
    return Object.assign(new ClientSummaryResponseDto(), client);
  }
}
