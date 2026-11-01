import {
  AccessDeniedException,
  ValidationException,
} from '../../../common/exceptions/app-exceptions';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user';
import { UserRole } from '../../users/domain/user-role.enum';
import type {
  CommandeRef,
  Pointage,
  PointageInput,
  PointagePort,
} from '../domain/pointage.port';
import { PointagesUseCase } from './pointages.use-case';

const MOI = 'AAAAAAAA-0000-0000-0000-000000000001';
const AUTRE = 'AAAAAAAA-0000-0000-0000-000000000002';

const employe: AuthenticatedUser = {
  userId: MOI,
  sessionId: 's',
  role: UserRole.Employee,
};
const direction: AuthenticatedUser = { ...employe, role: UserRole.Direction };

const input = (changes: Partial<PointageInput> = {}): PointageInput => ({
  utilisateurId: MOI,
  debut: new Date('2026-10-27T08:00:00Z'),
  fin: new Date('2026-10-27T09:30:00Z'),
  typeAction: 'DEBUG',
  clientId: 1,
  commandeId: null,
  contactId: null,
  description: null,
  facturable: 1,
  tempsFacturable: 1.5,
  ...changes,
});

const stored = (changes: Partial<Pointage> = {}): Pointage => ({
  ...input(),
  id: 5,
  clientCode: 'ALT',
  clientNom: 'ALTEA',
  commandeNumero: null,
  contactNom: null,
  ...changes,
});

/** Commandes connues : 10 = commande du client 1, 20 = contrat du client 1, 30 = client 2. */
const COMMANDES: Record<number, CommandeRef> = {
  10: { clientId: 1, contrat: false },
  20: { clientId: 1, contrat: true },
  30: { clientId: 2, contrat: false },
};

function setup(current: Pointage | null = stored()) {
  const created: PointageInput[] = [];
  const port = {
    find: () => Promise.resolve(current),
    list: () => Promise.resolve([]),
    create: (data: PointageInput) => {
      created.push(data);
      return Promise.resolve(5);
    },
    update: () => Promise.resolve(),
    delete: () => Promise.resolve(),
    personnes: () =>
      Promise.resolve([
        { id: MOI, nom: 'Moi' },
        { id: AUTRE, nom: 'Autre' },
      ]),
    typesAction: () => Promise.resolve([]),
    tags: () => Promise.resolve([]),
    clients: () => Promise.resolve([]),
    userExists: () => Promise.resolve(true),
    clientExists: (id: number) => Promise.resolve(id === 1 || id === 2),
    findCommande: (id: number) => Promise.resolve(COMMANDES[id] ?? null),
    contactClient: (id: number) => Promise.resolve(id === 7 ? 1 : 2),
    typeActionExists: (cle: string) => Promise.resolve(cle !== 'XXX'),
  } as unknown as PointagePort;
  return { useCase: new PointagesUseCase(port), created };
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

describe('PointagesUseCase', () => {
  it('crée un pointage valide', async () => {
    const { useCase, created } = setup();
    await useCase.create(employe, input());
    expect(created).toHaveLength(1);
  });

  it('refuse une fin avant le début et un type inconnu', async () => {
    const { useCase } = setup();
    const fields = await fieldsOf(
      useCase.create(
        employe,
        input({ fin: new Date('2026-10-27T07:00:00Z'), typeAction: 'XXX' }),
      ),
    );
    expect(fields).toEqual(['fin', 'typeAction']);
  });

  it('exige un client sauf pour le temps interne, les congés, fériés et arrêts', async () => {
    const { useCase } = setup();
    expect(
      await fieldsOf(useCase.create(employe, input({ clientId: null }))),
    ).toEqual(['clientId']);
    for (const typeAction of ['AUTRE', 'CP', 'FERIE', 'ARRET']) {
      expect(
        await fieldsOf(
          useCase.create(employe, input({ typeAction, clientId: null })),
        ),
      ).toEqual([]);
    }
  });

  it('développement sur devis : commande hors contrat du client', async () => {
    const { useCase } = setup();
    const devis = (commandeId: number | null) =>
      fieldsOf(
        useCase.create(employe, input({ typeAction: 'DEVIS', commandeId })),
      );
    expect(await devis(null)).toEqual(['commandeId']);
    expect(await devis(20)).toEqual(['commandeId']);
    expect(await devis(30)).toEqual(['commandeId']);
    expect(await devis(10)).toEqual([]);
  });

  it('assistance : commande sous contrat et contact du client', async () => {
    const { useCase } = setup();
    const assistance = (commandeId: number | null, contactId: number | null) =>
      fieldsOf(
        useCase.create(
          employe,
          input({ typeAction: 'ASSC', commandeId, contactId }),
        ),
      );
    expect(await assistance(null, null)).toEqual(['commandeId', 'contactId']);
    expect(await assistance(10, 8)).toEqual(['commandeId', 'contactId']);
    expect(await assistance(20, 7)).toEqual([]);
  });

  it("réserve les pointages d'une autre personne à Admin et Direction", async () => {
    const { useCase } = setup(stored({ utilisateurId: AUTRE }));
    await expect(
      useCase.create(employe, input({ utilisateurId: AUTRE })),
    ).rejects.toBeInstanceOf(AccessDeniedException);
    await expect(useCase.delete(employe, 5)).rejects.toBeInstanceOf(
      AccessDeniedException,
    );
    await expect(useCase.delete(direction, 5)).resolves.toBeUndefined();
  });

  it("limite la liste des personnes à l'utilisateur sans droit étendu", async () => {
    const { useCase } = setup();
    expect((await useCase.reference(employe)).personnes).toEqual([
      { id: MOI, nom: 'Moi' },
    ]);
    expect((await useCase.reference(direction)).personnes).toHaveLength(2);
  });
});
