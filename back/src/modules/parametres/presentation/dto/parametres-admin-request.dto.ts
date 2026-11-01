import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  REQUIRED,
  tooLong,
  trim,
} from '../../../../common/utils/form-dto.helpers';
import type {
  RubriqueInput,
  TableInput,
} from '../../domain/parametre-admin.port';

/** Chaîne facultative : espaces de bord retirés, absente → chaîne vide. */
const trimOrEmpty = ({ value }: { value: unknown }): unknown =>
  value === undefined || value === null ? '' : trim({ value });

export class RubriqueRequestDto implements RubriqueInput {
  @ApiPropertyOptional({
    nullable: true,
    type: String,
    example: '02',
    description: 'Numéro de la rubrique existante (null : nouvelle rubrique).',
  })
  @IsOptional()
  @Matches(/^\d{2}$/, { message: 'Numéro de rubrique invalide.' })
  ancienNum: string | null = null;

  @ApiProperty({ example: 'Libellé', maxLength: 40 })
  @Transform(trim)
  @IsString({ message: REQUIRED })
  @IsNotEmpty({ message: REQUIRED })
  @MaxLength(40, tooLong(40))
  nom!: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @Transform(trimOrEmpty)
  @IsString()
  @MaxLength(255, tooLong(255))
  aide = '';
}

/** Corps de PUT /parametres/admin/tables/:code. */
export class SaveTableRequestDto implements TableInput {
  @ApiProperty({ example: "Table des types d'action", maxLength: 40 })
  @Transform(trim)
  @IsString({ message: REQUIRED })
  @IsNotEmpty({ message: REQUIRED })
  @MaxLength(40, tooLong(40))
  nom!: string;

  @ApiProperty({ example: 'Code action', maxLength: 20 })
  @Transform(trim)
  @IsString({ message: REQUIRED })
  @IsNotEmpty({ message: REQUIRED })
  @MaxLength(20, tooLong(20))
  nomCle!: string;

  @ApiProperty({ example: 8, minimum: 1, maximum: 8 })
  @IsInt({ message: 'Taille de 1 à 8.' })
  @Min(1, { message: 'Taille de 1 à 8.' })
  @Max(8, { message: 'Taille de 1 à 8.' })
  tailleCle!: number;

  @ApiPropertyOptional({ maxLength: 255 })
  @Transform(trimOrEmpty)
  @IsString()
  @MaxLength(255, tooLong(255))
  aide = '';

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  codeDansCombo = false;

  @ApiProperty({ type: RubriqueRequestDto, isArray: true })
  @IsArray()
  @ArrayMinSize(1, { message: 'Au moins une rubrique (libellé).' })
  @ArrayMaxSize(99)
  @ValidateNested({ each: true })
  @Type(() => RubriqueRequestDto)
  rubriques!: RubriqueRequestDto[];
}

/** Corps de POST /parametres/admin/tables. */
export class CreateTableRequestDto extends SaveTableRequestDto {
  @ApiProperty({ example: 'TYPA', description: '4 lettres ou chiffres.' })
  @Transform(trim)
  @IsString({ message: REQUIRED })
  @IsNotEmpty({ message: REQUIRED })
  code!: string;
}

/** Corps de PUT /parametres/admin/tables/:code/parametres/:cle. */
export class SaveParametreRequestDto {
  @ApiProperty({ default: true })
  @IsBoolean()
  actif = true;

  @ApiProperty({
    example: { '01': 'Assistance sur contrat', '02': '153,204,255' },
    description: 'Valeurs par numéro de rubrique (vide = non renseignée).',
  })
  @IsObject()
  valeurs!: Record<string, string>;
}

/** Corps de POST /parametres/admin/tables/:code/parametres. */
export class CreateParametreRequestDto extends SaveParametreRequestDto {
  @ApiProperty({ example: 'ASSC' })
  @Transform(trim)
  @IsString({ message: REQUIRED })
  @IsNotEmpty({ message: REQUIRED })
  cle!: string;
}
