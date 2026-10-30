import {
  ResourceNotFoundException,
  ValidationException,
} from '../../../common/exceptions/app-exceptions';
import type {
  ClientDetail,
  ClientFichePort,
  ClientInput,
} from '../domain/client-fiche.port';
import { ClientFicheUseCase } from './client-fiche.use-case';

const input: ClientInput = {
  codeClient: ' altea ',
  raisonSociale: 'ALTEA SOLUTIONS',
  actif: true,
  adresse1: null,
  adresse2: null,
  adresse3: null,
  codePostal: '57070',
  ville: 'METZ',
  codePays: 'FR',
  groupe: null,
  numeroTva: null,
  modeReglement: null,
};

const detail = (id: number): ClientDetail => ({
  ...input,
  id,
  codeClient: 'ALTEA',
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: null,
  updatedBy: null,
});

function fakePort(overrides: Partial<ClientFichePort>): ClientFichePort {
  return {
    findClient: (id) => Promise.resolve(detail(id)),
    codeExists: () => Promise.resolve(false),
    createClient: () => Promise.resolve(7),
    updateClient: () => Promise.resolve(),
    ...overrides,
  } as ClientFichePort;
}

describe('ClientFicheUseCase', () => {
  it('crée le client avec un code en majuscules et renvoie la fiche', async () => {
    const created: ClientInput[] = [];
    const useCase = new ClientFicheUseCase(
      fakePort({
        createClient: (client) => {
          created.push(client);
          return Promise.resolve(7);
        },
      }),
    );

    const result = await useCase.create(input, 'user-1');

    expect(created[0]?.codeClient).toBe('ALTEA');
    expect(result.id).toBe(7);
  });

  it('refuse un code déjà utilisé par un autre client (erreur sur le champ)', async () => {
    const excluded: (number | undefined)[] = [];
    const useCase = new ClientFicheUseCase(
      fakePort({
        codeExists: (_code, excludeId) => {
          excluded.push(excludeId);
          return Promise.resolve(true);
        },
      }),
    );

    await expect(useCase.update(3, input, 'user-1')).rejects.toBeInstanceOf(
      ValidationException,
    );
    expect(excluded).toEqual([3]);
  });

  it('signale un client inconnu', async () => {
    const useCase = new ClientFicheUseCase(
      fakePort({ findClient: () => Promise.resolve(null) }),
    );

    await expect(useCase.get(99)).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
  });
});
