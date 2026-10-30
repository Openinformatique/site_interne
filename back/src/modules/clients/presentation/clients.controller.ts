import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PaginatedResult } from '../../../common/pagination/paginated-result';
import { SortDirection } from '../../../common/pagination/sort-direction.enum';
import { ListClientsUseCase } from '../application/list-clients.use-case';
import { ClientSummaryResponseDto } from './dto/client-summary-response.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';

/**
 * Clients — contrat consommé par le module clients du front.
 * Accessible à tout utilisateur authentifié (guard JWT global).
 */
@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(private readonly listClients: ListClientsUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'Liste paginée des clients',
    description:
      'Actifs uniquement par défaut. Recherche multi-mots insensible à la casse et aux accents ' +
      '(code, raison sociale, adresses, CP, ville, pays, n° TVA, groupe). Tri par défaut : raison sociale.',
  })
  @ApiOkResponse({ type: ClientSummaryResponseDto, isArray: true })
  async list(
    @Query() query: ListClientsQueryDto,
  ): Promise<PaginatedResult<ClientSummaryResponseDto>> {
    const result = await this.listClients.execute({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy ?? 'raisonSociale',
      sortDirection: query.sortDirection ?? SortDirection.Asc,
      search: query.search,
      includeInactive: query.includeInactive ?? false,
      groupes: query.groupes ?? [],
      sansGroupe: query.sansGroupe ?? false,
    });
    return {
      items: result.items.map((client) =>
        ClientSummaryResponseDto.fromDomain(client),
      ),
      meta: result.meta,
    };
  }
}
