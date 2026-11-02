import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user';
import { UserRole } from '../../users/domain/user-role.enum';
import type { RecherchePort } from '../domain/recherche.port';
import { RechercheUseCase, termesDe } from './recherche.use-case';

const vide = { total: 0, items: [] };

function port() {
  const clients = jest.fn().mockResolvedValue(vide);
  const commandes = jest.fn().mockResolvedValue(vide);
  const pointages = jest
    .fn<
      ReturnType<RecherchePort['pointages']>,
      Parameters<RecherchePort['pointages']>
    >()
    .mockResolvedValue({ ...vide, heures: 0 });
  return {
    clients,
    commandes,
    pointages,
    port: { clients, commandes, pointages } as RecherchePort,
  };
}

const user = (role: UserRole): AuthenticatedUser => ({
  userId: 'moi',
  sessionId: 's',
  role,
});

describe('RechercheUseCase', () => {
  it('découpe en mots (8 au plus) et ignore une recherche trop courte', () => {
    expect(termesDe('  contrat   corail ')).toEqual(['contrat', 'corail']);
    expect(termesDe('a b c d e f g h i j')).toHaveLength(8);
    expect(termesDe(' x ')).toEqual([]);
  });

  it('limite les pointages aux siens, sauf pour Admin et Direction', async () => {
    const { pointages, port: recherche } = port();
    const useCase = new RechercheUseCase(recherche);

    await useCase.rechercher(user(UserRole.Employee), 'corail', 4);
    await useCase.rechercher(user(UserRole.Direction), 'corail', 4);

    expect(pointages.mock.calls.map((call) => call[1])).toEqual(['moi', null]);
  });

  it('borne la limite à 200 et ne lance aucune requête sans terme', async () => {
    const { clients, port: recherche } = port();
    const useCase = new RechercheUseCase(recherche);

    await useCase.rechercher(user(UserRole.Admin), 'corail', 1000);
    expect(clients).toHaveBeenCalledWith(['corail'], 200);

    const resultat = await useCase.rechercher(user(UserRole.Admin), 'x', 5);
    expect(resultat.pointages).toEqual({ total: 0, items: [], heures: 0 });
    expect(clients).toHaveBeenCalledTimes(1);
  });
});
