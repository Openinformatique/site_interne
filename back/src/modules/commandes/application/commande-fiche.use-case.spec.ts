import { ValidationException } from '../../../common/exceptions/app-exceptions';
import type {
  CommandeDetail,
  CommandeFichePort,
  CommandeInput,
} from '../domain/commande-fiche.port';
import type { CommandeListPort } from '../domain/commande-list.port';
import { CommandeFicheUseCase } from './commande-fiche.use-case';

const input: CommandeInput = {
  clientId: 1,
  clientContratId: null,
  typeCommande: 'COM',
  numeroDevis: null,
  dateDevis: '2026-10-06',
  numeroCommandeClient: '26/266',
  dateCommande: '2026-10-20',
  libelleCommande: 'Migration',
  nbJoursCommande: 37,
  nbJoursPrevus: 30,
  delai: null,
  montant: null,
  dateCloture: null,
};

const detail = (changes: Partial<CommandeDetail> = {}): CommandeDetail => ({
  ...input,
  id: 7,
  client: 'ALTEA',
  clientActif: true,
  hasPointages: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: null,
  updatedBy: null,
  ...changes,
});

function setup(current: CommandeDetail | null, clientActif: boolean | null) {
  const updates: CommandeInput[] = [];
  const fiche = {
    findCommande: () => Promise.resolve(current),
    createCommande: () => Promise.resolve(7),
    updateCommande: (_id: number, data: CommandeInput) => {
      updates.push(data);
      return Promise.resolve();
    },
    findClientActif: () => Promise.resolve(clientActif),
    contratBelongsToClient: () => Promise.resolve(false),
    parametreExists: () => Promise.resolve(true),
  } as unknown as CommandeFichePort;
  const list = {} as CommandeListPort;
  return { useCase: new CommandeFicheUseCase(fiche, list), updates };
}

async function fieldsOf(promise: Promise<unknown>): Promise<string[]> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ValidationException) {
      return (error.details ?? []).map((detail) => detail.field);
    }
    throw error;
  }
  return [];
}

describe('CommandeFicheUseCase', () => {
  it('refuse un client inactif à la création', async () => {
    const { useCase } = setup(null, false);
    expect(await fieldsOf(useCase.create(input, 'u'))).toEqual(['clientId']);
  });

  it('refuse de changer le client quand des pointages sont rattachés', async () => {
    const { useCase, updates } = setup(detail({ hasPointages: true }), true);
    expect(
      await fieldsOf(useCase.update(7, { ...input, clientId: 2 }, 'u')),
    ).toEqual(['clientId']);
    expect(updates).toHaveLength(0);
  });

  it('garde un client devenu inactif tant qu’il ne change pas', async () => {
    const { useCase, updates } = setup(detail({ clientActif: false }), false);
    await useCase.update(7, input, 'u');
    expect(updates).toHaveLength(1);
  });

  it('refuse un contrat d’un autre client', async () => {
    const { useCase } = setup(null, true);
    expect(
      await fieldsOf(useCase.create({ ...input, clientContratId: 3 }, 'u')),
    ).toEqual(['clientContratId']);
  });
});
