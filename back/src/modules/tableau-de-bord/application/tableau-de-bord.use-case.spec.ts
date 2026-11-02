import type {
  CommandeALivrerBrute,
  ContratCandidat,
  SuiviContrat,
  TableauDeBordPort,
} from '../domain/tableau-de-bord.port';
import { TableauDeBordUseCase } from './tableau-de-bord.use-case';

const AUJOURDHUI = '2026-11-02';

function candidat(
  contratId: number,
  dateEcheance: string | null = null,
): ContratCandidat {
  return {
    contratId,
    libelleContrat: `Contrat ${contratId}`,
    dateEcheance,
    clientId: contratId,
    codeClient: `C${contratId}`,
    raisonSociale: `Client ${contratId}`,
  };
}

function port(overrides: Partial<TableauDeBordPort>): TableauDeBordPort {
  return {
    contratsCandidats: jest.fn().mockResolvedValue([]),
    suivis: jest.fn().mockResolvedValue(new Map()),
    commandesALivrer: jest.fn().mockResolvedValue([]),
    absences: jest.fn().mockResolvedValue([]),
    heuresParJour: jest.fn().mockResolvedValue(8),
    ...overrides,
  };
}

describe('TableauDeBordUseCase', () => {
  it('retient les contrats de plus d’1 h de crédit dont il reste moins d’1 h, du restant le plus bas au plus haut', async () => {
    const suivis = new Map<number, SuiviContrat>([
      [1, { credit: 100, debit: 99 }],
      [2, { credit: 100, debit: 99.5 }],
      [3, { credit: 40, debit: 46.5 }],
      [4, { credit: 1, debit: 1 }],
      [6, { credit: 0.5, debit: 0.5 }],
    ]);
    const useCase = new TableauDeBordUseCase(
      port({
        contratsCandidats: jest
          .fn()
          .mockResolvedValue([
            candidat(1),
            candidat(2, '2026-11-15'),
            candidat(3),
            candidat(4),
            candidat(5),
            candidat(6),
          ]),
        suivis: jest.fn().mockResolvedValue(suivis),
      }),
    );

    const contrats = await useCase.contratsARenouveler(AUJOURDHUI);

    expect(contrats.map((c) => c.contratId)).toEqual([3, 2]);
    expect(contrats[0]).toMatchObject({
      restant: -6.5,
      consommation: 1.1625,
      joursAvantEcheance: null,
    });
    expect(contrats[1]).toMatchObject({
      restant: 0.5,
      consommation: 0.995,
      joursAvantEcheance: 13,
    });
  });

  it('cherche les commandes jusqu’à J+14 et convertit les heures pointées en jours', async () => {
    const brute: CommandeALivrerBrute = {
      id: 7,
      clientId: 1,
      codeClient: 'C1',
      raisonSociale: 'Client 1',
      libelle: 'Migration',
      numeroCommande: 'C2026-0412',
      numeroDevis: null,
      delai: '2026-10-15',
      joursCommandes: 5,
      heuresPointees: 50,
    };
    const commandesALivrer = jest.fn().mockResolvedValue([brute]);
    const useCase = new TableauDeBordUseCase(port({ commandesALivrer }));

    const [commande] = await useCase.commandesALivrer(AUJOURDHUI);

    expect(commandesALivrer).toHaveBeenCalledWith('2026-11-16');
    expect(commande).toMatchObject({ joursAvantDelai: -18, joursPasses: 6.25 });
    expect(commande).not.toHaveProperty('heuresPointees');
  });

  it('donne une fenêtre de congés de 15 jours, aujourd’hui compris', async () => {
    const useCase = new TableauDeBordUseCase(port({}));
    const conges = await useCase.conges(AUJOURDHUI);
    expect(conges).toMatchObject({
      du: '2026-11-02',
      au: '2026-11-16',
      conges: [],
    });
  });
});
