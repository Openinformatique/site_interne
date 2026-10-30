import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ValidationException } from '../../../common/exceptions/app-exceptions';
import { ListParametreValuesUseCase } from '../application/list-parametre-values.use-case';
import { ParametreValueResponseDto } from './dto/parametre-value-response.dto';

/** Code d'une table de paramètres : 4 caractères alphanumériques. */
const CODE_TABLE_PATTERN = /^[A-Za-z0-9]{4}$/;

/**
 * Lecture du paramétrage (tables PARTAB / PARFIC de l'application
 * historique). Accessible à tout utilisateur authentifié.
 */
@ApiTags('Paramètres')
@ApiBearerAuth()
@Controller('parametres')
export class ParametresController {
  constructor(private readonly listValues: ListParametreValuesUseCase) {}

  @Get(':codeTable')
  @ApiOperation({ summary: "Valeurs actives d'une table de paramètres" })
  @ApiParam({
    name: 'codeTable',
    example: 'GSOC',
    description: 'Code de la table (4 caractères).',
  })
  @ApiOkResponse({ type: ParametreValueResponseDto, isArray: true })
  async list(
    @Param('codeTable') codeTable: string,
  ): Promise<ParametreValueResponseDto[]> {
    if (!CODE_TABLE_PATTERN.test(codeTable)) {
      throw new ValidationException([
        {
          field: 'codeTable',
          message:
            'Le code de table doit comporter 4 caractères alphanumériques.',
        },
      ]);
    }
    const values = await this.listValues.execute(codeTable);
    return values.map((value) => ParametreValueResponseDto.fromDomain(value));
  }
}
