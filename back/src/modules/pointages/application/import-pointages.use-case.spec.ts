import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user';
import { UserRole } from '../../users/domain/user-role.enum';
import type { Cellule } from '../domain/import-pointages';
import type { PointageInput, PointagePort } from '../domain/pointage.port';
import {
  ImportPointagesUseCase,
  choisirCommande,
  choisirContact,
  type ClasseurImportPort,
} from './import-pointages.use-case';
import { PointagesUseCase } from './pointages.use-case';

const MOI = '11111111-1111-1111-1111-111111111111';
const user: AuthenticatedUser = {
  userId: MOI,
  sessionId: 's',
  role: UserRole.Employee,
};

const ENTETES: Cellule[] = [
  'Client',
  'Type de tâche',
  'Thème',
  'Devis',
  'Date',
  'Durée',
  'Observations',
  'Contact',
];

function port(): PointagePort & { crees: PointageInput[] } {
  const crees: PointageInput[] = [];
  const commandes = [
    {
      id: 69,
      numero: 'ASSISTANCE',
      libelle: null,
      contrat: true,
      cloturee: false,
    },
    {
      id: 70,
      numero: 'ASSISTANCE',
      libelle: null,
      contrat: true,
      cloturee: true,
    },
    { id: 71, numero: '24/112', libelle: null, contrat: true, cloturee: true },
  ];
  return {
    crees,
    typesAction: () =>
      Promise.resolve(
        ['ASSC', 'COM', 'AUTRE'].map((cle) => ({
          cle,
          libelle: cle,
          couleur: null,
        })),
      ),
    tags: () => Promise.resolve(['Suivi projet']),
    clients: () => Promise.resolve([{ id: 50, code: 'ALPHI', nom: 'ALPHI' }]),
    commandes: () => Promise.resolve(commandes),
    contacts: () =>
      Promise.resolve([{ id: 178, nom: 'GIRARD,Magali', actif: true }]),
    createMany: (inputs: readonly PointageInput[]) => {
      crees.push(...inputs);
      return Promise.resolve(inputs.length);
    },
    // Règles de saisie : références toujours valides.
    userExists: () => Promise.resolve(true),
    typeActionExists: () => Promise.resolve(true),
    clientExists: () => Promise.resolve(true),
    findCommande: (id: number) =>
      Promise.resolve({ clientId: 50, contrat: id !== 0 }),
    contactClient: () => Promise.resolve(50),
  } as unknown as PointagePort & { crees: PointageInput[] };
}

function useCase(lignes: Cellule[][], entetes = ENTETES) {
  const pointages = port();
  const classeur: ClasseurImportPort = {
    lire: () =>
      Promise.resolve({
        entetes,
        lignes: lignes.map((cellules, index) => ({
          numero: index + 2,
          cellules,
        })),
        tropDeLignes: false,
      }),
  };
  return {
    pointages,
    useCase: new ImportPointagesUseCase(
      pointages,
      classeur,
      new PointagesUseCase(pointages),
    ),
  };
}

const date = new Date(Date.UTC(2026, 9, 26));

describe('ImportPointagesUseCase', () => {
  it('importe un fichier valide, à partir de 7 h, tags paramétrés reconnus', async () => {
    const { useCase: uc, pointages } = useCase([
      [
        'ALPHI',
        'ASSC',
        'suivi projet',
        'ASSISTANCE',
        date,
        0.5,
        'Clôture',
        'GIRARD Magali',
      ],
      [null, 'AUTRE', 'Revue', null, date, 1.5, 'Revue site', null],
      [null, null, null, null, null, null, null, null],
    ]);

    const resultat = await uc.importer(user, MOI, Buffer.from(''));

    expect(resultat.erreurs).toEqual([]);
    expect(resultat.importes).toBe(2);
    expect(resultat.pointages.map((p) => [p.ligne, p.debut, p.fin])).toEqual([
      [2, '07:00', '07:30'],
      [3, '07:30', '09:00'],
    ]);
    expect(pointages.crees[0]).toMatchObject({
      clientId: 50,
      commandeId: 69,
      contactId: 178,
      typeAction: 'ASSC',
      description: '[Suivi projet] Clôture',
      facturable: 1,
      tempsFacturable: 0.5,
    });
    expect(pointages.crees[1]).toMatchObject({
      clientId: null,
      description: '[Revue] Revue site',
    });
    expect(pointages.crees[0]!.debut.toISOString()).toBe(
      '2026-10-26T06:00:00.000Z',
    );
  });

  it("n'importe rien et liste les erreurs par ligne", async () => {
    const { useCase: uc, pointages } = useCase([
      ['ALPHI', 'ASSC', null, 'ASSISTANCE', date, 0.5, 'Ok', 'GIRARD Magali'],
      ['ALPHY', 'ASSC', null, 'ASSISTANCE', date, 1, 'x', null],
      ['ALPHI', 'DEBUGG', null, '24/112', date, 1, 'x', 'DUPONT Jean'],
    ]);

    const resultat = await uc.importer(user, MOI, Buffer.from(''));

    expect(resultat.importes).toBe(0);
    expect(pointages.crees).toEqual([]);
    expect(resultat.erreurs.map((e) => [e.ligne, e.colonne])).toEqual([
      [3, 'A – Client'],
      [4, 'B – Type de tâche'],
      [4, 'D – Devis'],
      [4, 'H – Contact'],
    ]);
  });

  it('applique les règles de la saisie (contact obligatoire en assistance)', async () => {
    const { useCase: uc } = useCase([
      ['ALPHI', 'ASSC', null, 'ASSISTANCE', date, 0.5, 'Sans contact', null],
    ]);
    const resultat = await uc.verifier(user, MOI, Buffer.from(''));
    expect(resultat.erreurs).toEqual([
      expect.objectContaining({ ligne: 2, colonne: 'H – Contact' }),
    ]);
  });

  it("refuse un fichier dont les colonnes ne sont pas dans l'ordre", async () => {
    const { useCase: uc, pointages } = useCase(
      [['ALPHI', 'COM', null, null, date, 1, 'x', null]],
      [
        'Client',
        'Type de tâche',
        'Devis',
        'Thème',
        'Date',
        'Durée',
        'Observations',
        'Contact',
      ],
    );
    const resultat = await uc.importer(user, MOI, Buffer.from(''));
    expect(resultat.format?.conforme).toBe(false);
    expect(resultat.pointages).toEqual([]);
    expect(pointages.crees).toEqual([]);
  });

  it("interdit d'importer pour une autre personne sans droit étendu", async () => {
    const { useCase: uc } = useCase([]);
    await expect(
      uc.verifier(
        user,
        '22222222-2222-2222-2222-222222222222',
        Buffer.from(''),
      ),
    ).rejects.toThrow();
  });
});

describe('choisirCommande / choisirContact', () => {
  const commande = (id: number, numero: string, cloturee: boolean) => ({
    id,
    numero,
    libelle: null,
    contrat: true,
    cloturee,
  });

  it('retient la commande en cours portant le numéro', () => {
    expect(
      choisirCommande(
        [commande(1, 'ASSISTANCE', true), commande(2, 'assistance', false)],
        'ASSISTANCE',
      ),
    ).toMatchObject({ id: 2 });
    expect(choisirCommande([commande(1, '24/112', true)], '24/112')).toContain(
      'clôturée',
    );
    expect(
      choisirCommande([commande(1, 'X', false), commande(2, 'X', false)], 'X'),
    ).toContain('ambigu');
    expect(choisirCommande([], 'X')).toContain('Aucune commande');
  });

  it('retrouve le contact « NOM Prénom », actif de préférence', () => {
    expect(
      choisirContact(
        [
          { id: 1, nom: 'SEGUIN,Néphéli', actif: false },
          { id: 2, nom: 'SEGUIN,Nepheli', actif: true },
        ],
        'seguin néphéli',
      ),
    ).toMatchObject({ id: 2 });
    expect(choisirContact([], 'X')).toBeNull();
  });
});
