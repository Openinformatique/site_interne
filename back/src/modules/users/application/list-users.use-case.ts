import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../common/pagination/paginated-result';
import { PaginationMetaDto } from '../../../common/pagination/pagination-meta.dto';
import { User } from '../domain/user';
import { USER_REPOSITORY } from '../domain/user-repository.port';
import type {
  ListUsersQuery,
  UserRepositoryPort,
} from '../domain/user-repository.port';

/**
 * Cas d'utilisation : liste paginée des utilisateurs.
 *
 * Tri validé par liste blanche côté repository, recherche sur e-mail et
 * nom d'affichage, filtres optionnels rôle / statut actif.
 */
@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(query: ListUsersQuery): Promise<PaginatedResult<User>> {
    const page = await this.userRepository.findPage(query);
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
