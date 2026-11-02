import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  REQUIRED,
  tooLong,
  trim,
  trimToNull,
} from '../../../../common/utils/form-dto.helpers';
import { FACTURABLE_CODES } from '../../domain/pointage.port';
import type {
  ClientOption,
  CommandeOption,
  ContactOption,
  PersonneOption,
  Pointage,
  TypeAction,
} from '../../domain/pointage.port';
import type { PointagesReference } from '../../application/pointages.use-case';

const INSTANT = 'Date et heure invalides (ISO 8601).';
const TEMPS_MESSAGE = 'Durée invalide (0 à 24 h, 4 décimales maximum).';

/** Champ numérique : chaîne vide → null. */
const emptyToNull = ({ value }: { value: unknown }): unknown =>
  value === '' ? null : value;

/** Query de GET /pointages : planning d'une personne sur une période. */
export class ListPointagesQueryDto {
  @ApiProperty({ description: "Identifiant de l'utilisateur." })
  @IsUUID('all', { message: 'Personne invalide.' })
  utilisateurId!: string;

  @ApiProperty({ example: '2026-10-25T23:00:00.000Z' })
  @IsISO8601({}, { message: INSTANT })
  du!: string;

  @ApiProperty({ example: '2026-11-01T23:00:00.000Z' })
  @IsISO8601({}, { message: INSTANT })
  au!: string;
}

/** Contenu du relevé mensuel. */
export const CONTENUS_RELEVE = ['detail', 'synthese'] as const;

/** Query de GET /pointages/releve.pdf : relevé mensuel d'une personne. */
export class ReleveMensuelQueryDto {
  @ApiProperty({ description: "Identifiant de l'utilisateur." })
  @IsUUID('all', { message: 'Personne invalide.' })
  utilisateurId!: string;

  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt({ message: 'Année invalide.' })
  @Min(2000, { message: 'Année invalide.' })
  @Max(2100, { message: 'Année invalide.' })
  annee!: number;

  @ApiProperty({ example: 9, description: 'Mois de 1 à 12.' })
  @Type(() => Number)
  @IsInt({ message: 'Mois invalide.' })
  @Min(1, { message: 'Mois invalide.' })
  @Max(12, { message: 'Mois invalide.' })
  mois!: number;

  @ApiPropertyOptional({ enum: CONTENUS_RELEVE, default: 'detail' })
  @IsOptional()
  @IsIn(CONTENUS_RELEVE, { message: 'Contenu invalide.' })
  contenu?: (typeof CONTENUS_RELEVE)[number];
}

/** Corps de POST /pointages et PUT /pointages/:id. */
export class SavePointageRequestDto {
  @ApiProperty()
  @IsUUID('all', { message: 'Personne invalide.' })
  utilisateurId!: string;

  @ApiProperty({ example: '2026-10-27T08:00:00.000Z' })
  @IsNotEmpty({ message: REQUIRED })
  @IsISO8601({}, { message: INSTANT })
  debut!: string;

  @ApiProperty({ example: '2026-10-27T09:30:00.000Z' })
  @IsNotEmpty({ message: REQUIRED })
  @IsISO8601({}, { message: INSTANT })
  fin!: string;

  @ApiProperty({ description: 'Clé TYPA.', example: 'ASSC', maxLength: 20 })
  @Transform(trim)
  @IsString({ message: REQUIRED })
  @IsNotEmpty({ message: REQUIRED })
  @MaxLength(20, tooLong(20))
  typeAction!: string;

  @ApiPropertyOptional({ nullable: true, type: Number })
  @IsOptional()
  @IsInt({ message: 'Client invalide.' })
  clientId: number | null = null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  @IsOptional()
  @IsInt({ message: 'Commande invalide.' })
  commandeId: number | null = null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  @IsOptional()
  @IsInt({ message: 'Contact invalide.' })
  contactId: number | null = null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    description: 'Tags entre crochets en tête : « [Tag] texte ».',
  })
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(4000, tooLong(4000))
  description: string | null = null;

  @ApiProperty({
    description:
      '0 = non facturable, 1 = facturable, 2 = en attente (3 et 4 : codes repris).',
    enum: FACTURABLE_CODES,
  })
  @IsIn(FACTURABLE_CODES, { message: 'Valeur invalide.' })
  facturable!: number;

  @ApiPropertyOptional({ nullable: true, type: Number, example: 1.5 })
  @Transform(emptyToNull)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 }, { message: TEMPS_MESSAGE })
  @Min(0, { message: TEMPS_MESSAGE })
  @Max(24, { message: TEMPS_MESSAGE })
  tempsFacturable: number | null = null;
}

export class PointageResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() utilisateurId!: string;
  @ApiProperty() debut!: string;
  @ApiProperty() fin!: string;
  @ApiProperty({ description: 'Clé TYPA.' }) typeAction!: string;
  @ApiProperty({ nullable: true, type: Number }) clientId!: number | null;
  @ApiProperty({ nullable: true, type: String }) clientCode!: string | null;
  @ApiProperty({ nullable: true, type: String }) clientNom!: string | null;
  @ApiProperty({ nullable: true, type: Number }) commandeId!: number | null;
  @ApiProperty({ nullable: true, type: String })
  commandeNumero!: string | null;
  @ApiProperty({ nullable: true, type: Number }) contactId!: number | null;
  @ApiProperty({ nullable: true, type: String }) contactNom!: string | null;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty() facturable!: number;
  @ApiProperty({ nullable: true, type: Number })
  tempsFacturable!: number | null;

  static fromDomain(pointage: Pointage): PointageResponseDto {
    return Object.assign(new PointageResponseDto(), {
      ...pointage,
      debut: pointage.debut.toISOString(),
      fin: pointage.fin.toISOString(),
    });
  }
}

class TypeActionDto implements TypeAction {
  @ApiProperty() cle!: string;
  @ApiProperty() libelle!: string;
  @ApiProperty({ nullable: true, type: String, description: '« R,V,B ».' })
  couleur!: string | null;
}

class PersonneDto implements PersonneOption {
  @ApiProperty() id!: string;
  @ApiProperty() nom!: string;
}

class ClientOptionDto implements ClientOption {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true, type: String }) code!: string | null;
  @ApiProperty({ nullable: true, type: String }) nom!: string | null;
}

export class PointagesReferenceResponseDto implements PointagesReference {
  @ApiProperty({ type: TypeActionDto, isArray: true }) types!: TypeAction[];
  @ApiProperty({ type: String, isArray: true }) tags!: string[];
  @ApiProperty({ type: PersonneDto, isArray: true })
  personnes!: PersonneOption[];
  @ApiProperty({ type: ClientOptionDto, isArray: true })
  clients!: ClientOption[];
}

class ContactOptionDto implements ContactOption {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true, type: String }) nom!: string | null;
  @ApiProperty() actif!: boolean;
}

class CommandeOptionDto implements CommandeOption {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true, type: String }) numero!: string | null;
  @ApiProperty({ nullable: true, type: String }) libelle!: string | null;
  @ApiProperty({ description: 'Commande rattachée à un contrat client.' })
  contrat!: boolean;
  @ApiProperty() cloturee!: boolean;
}

export class ClientPointageOptionsResponseDto {
  @ApiProperty({ type: ContactOptionDto, isArray: true })
  contacts!: ContactOption[];
  @ApiProperty({ type: CommandeOptionDto, isArray: true })
  commandes!: CommandeOption[];
}
