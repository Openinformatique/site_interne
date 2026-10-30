import { Controller, Get, Query, Res, StreamableFile } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { PaginatedResult } from '../../../common/pagination/paginated-result';
import { SortDirection } from '../../../common/pagination/sort-direction.enum';
import { ListCommandesUseCase } from '../application/list-commandes.use-case';
import type { CommandesFilter } from '../domain/commande-list.port';
import {
  CommandeClientOptionResponseDto,
  CommandeListItemResponseDto,
} from './dto/commande-list-response.dto';
import { ListCommandesQueryDto } from './dto/list-commandes-query.dto';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Commandes — contrat consommé par l'écran « Commandes » du front.
 * Accessible à tout utilisateur authentifié (guard JWT global).
 */
@ApiTags('Commandes')
@ApiBearerAuth()
@Controller('commandes')
export class CommandesController {
  constructor(private readonly listCommandes: ListCommandesUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'Liste paginée des commandes',
    description:
      'En cours uniquement par défaut. Recherche multi-mots insensible à la casse et aux accents ' +
      '(n° commande, n° devis, libellé, client, contrat, montant). Période : date du devis ou de ' +
      'commande. Tri par défaut : client, puis date de commande décroissante.',
  })
  @ApiOkResponse({ type: CommandeListItemResponseDto, isArray: true })
  async list(
    @Query() query: ListCommandesQueryDto,
  ): Promise<PaginatedResult<CommandeListItemResponseDto>> {
    const result = await this.listCommandes.list({
      ...toFilter(query),
      page: query.page,
      limit: query.limit,
    });
    return {
      items: result.items.map((commande) =>
        CommandeListItemResponseDto.fromDomain(commande),
      ),
      meta: result.meta,
    };
  }

  @Get('clients')
  @ApiOperation({
    summary: 'Clients du filtre « Client »',
    description: 'Clients (actifs ou non) ayant au moins une commande.',
  })
  @ApiOkResponse({ type: CommandeClientOptionResponseDto, isArray: true })
  async clients(): Promise<CommandeClientOptionResponseDto[]> {
    return (await this.listCommandes.clients()).map((client) =>
      CommandeClientOptionResponseDto.fromDomain(client),
    );
  }

  @Get('export')
  @ApiOperation({
    summary: 'Export Excel de la liste',
    description:
      'Toutes les commandes du filtre (pagination ignorée), dans l’ordre du tri.',
  })
  @ApiProduces(XLSX_MIME)
  async export(
    @Query() query: ListCommandesQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.listCommandes.export(toFilter(query));
    response.setHeader('Content-Type', XLSX_MIME);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.filename)}"`,
    );
    return new StreamableFile(file.content);
  }
}

function toFilter(query: ListCommandesQueryDto): CommandesFilter {
  return {
    sortBy: query.sortBy ?? 'client',
    sortDirection: query.sortDirection ?? SortDirection.Asc,
    search: query.search,
    includeClosed: query.includeClosed ?? false,
    du: query.du,
    au: query.au,
    clientId: query.clientId,
    groupes: query.groupes ?? [],
    sansGroupe: query.sansGroupe ?? false,
  };
}
