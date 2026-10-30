import { SortDirection } from '../../../common/pagination/sort-direction.enum';
import type {
  ClientRepositoryPort,
  ClientSummary,
  ListClientsQuery,
} from '../domain/client-repository.port';
import { ListClientsUseCase } from './list-clients.use-case';

const client = (id: number): ClientSummary => ({
  id,
  codeClient: `C${id}`,
  raisonSociale: `CLIENT ${id}`,
  groupe: null,
  actif: true,
  adresse1: null,
  adresse2: null,
  adresse3: null,
  codePostal: '57000',
  ville: 'METZ',
  codePays: 'FR',
});

const baseQuery: ListClientsQuery = {
  page: 2,
  limit: 50,
  sortBy: 'raisonSociale',
  sortDirection: SortDirection.Asc,
  includeInactive: false,
  groupes: [],
  sansGroupe: false,
};

describe('ListClientsUseCase', () => {
  it('transmet la requête au repository et calcule la pagination', async () => {
    const received: ListClientsQuery[] = [];
    const repository: ClientRepositoryPort = {
      findPage: (query) => {
        received.push(query);
        return Promise.resolve({
          items: [client(51), client(52)],
          totalItems: 120,
        });
      },
    };

    const result = await new ListClientsUseCase(repository).execute(baseQuery);

    expect(received).toEqual([baseQuery]);
    expect(result.items.map((item) => item.id)).toEqual([51, 52]);
    expect(result.meta.page).toBe(2);
    expect(result.meta.totalItems).toBe(120);
    expect(result.meta.totalPages).toBe(3);
    expect(result.meta.hasNextPage).toBe(true);
    expect(result.meta.hasPreviousPage).toBe(true);
  });

  it('renvoie une page vide sans erreur', async () => {
    const repository: ClientRepositoryPort = {
      findPage: () => Promise.resolve({ items: [], totalItems: 0 }),
    };

    const result = await new ListClientsUseCase(repository).execute({
      ...baseQuery,
      page: 1,
    });

    expect(result.items).toEqual([]);
    expect(result.meta.totalPages).toBe(0);
    expect(result.meta.hasNextPage).toBe(false);
  });
});
