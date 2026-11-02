import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user';
import { RechercheUseCase } from '../application/recherche.use-case';
import {
  RechercheQueryDto,
  ResultatRechercheResponseDto,
} from './dto/recherche.dto';

/** Recherche globale (barre du haut et onglet « Recherche »). */
@ApiTags('Recherche')
@ApiBearerAuth()
@Controller('recherche')
export class RechercheController {
  constructor(private readonly recherche: RechercheUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'Recherche globale',
    description:
      'Clients, commandes et pointages contenant chacun des mots (casse et accents indifférents) ; totaux et `limite` premiers résultats par catégorie. Pointages : les siens, ceux de tous pour Admin et Direction.',
  })
  @ApiOkResponse({ type: ResultatRechercheResponseDto })
  async rechercher(
    @Query() query: RechercheQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ResultatRechercheResponseDto> {
    return ResultatRechercheResponseDto.fromDomain(
      await this.recherche.rechercher(user, query.q, query.limite ?? 5),
    );
  }
}
