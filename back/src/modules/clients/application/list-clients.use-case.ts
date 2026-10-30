import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../common/pagination/paginated-result';
import { PaginationMetaDto } from '../../../common/pagination/pagination-meta.dto';
import { CLIENT_REPOSITORY } from '../domain/client-repository.port';
import type {
  ClientRepositoryPort,
  ClientSummary,
  ListClientsQuery,
} from '../domain/client-repository.port';

/**
 * Cas d'utilisation : liste paginée des clients (écran « Liste des
 * clients »), filtrée par statut, groupe et recherche multi-mots.
 */
@Injectable()
export class ListClientsUseCase {
  constructor(
    @Inject(CLIENT_REPOSITORY)
    private readonly clientRepository: ClientRepositoryPort,
  ) {}

  async execute(
    query: ListClientsQuery,
  ): Promise<PaginatedResult<ClientSummary>> {
    const page = await this.clientRepository.findPage(query);
    return {
      items: page.items,
      meta: PaginationMetaDto.fromTotals(
        query.page,
        query.limit,
        page.totalItems,
      ),
    };
  }
}
