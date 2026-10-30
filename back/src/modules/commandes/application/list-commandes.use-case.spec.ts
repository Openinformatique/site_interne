import { SortDirection } from '../../../common/pagination/sort-direction.enum';
import type {
  CommandeListItem,
  CommandeListPort,
  CommandesFilter,
  CommandesSpreadsheetPort,
} from '../domain/commande-list.port';
import { ListCommandesUseCase } from './list-commandes.use-case';

const commande = (id: number): CommandeListItem => ({
  id,
  clientId: 1,
  codeClient: 'ALTEA',
  client: 'ALTEA SOLUTIONS',
  groupe: null,
  groupeLibelle: null,
  dateCommande: '2026-04-14',
  numeroCommande: `26/${id}`,
  numeroDevis: `26/${id}`,
  dateDevis: '2026-04-07',
  delai: null,
  libelle: 'Évolution',
  joursPrevus: 1,
  joursPasses: 0.5,
  joursCommandes: 1,
  montant: 650,
  dateCloture: null,
});

const filter: CommandesFilter = {
  sortBy: 'client',
  sortDirection: SortDirection.Asc,
  includeClosed: false,
  groupes: [],
  sansGroupe: false,
};

function setup() {
  const calls: { heures: number[]; built: CommandeListItem[][] } = {
    heures: [],
    built: [],
  };
  const port: CommandeListPort = {
    findPage: (_query, heures) => {
      calls.heures.push(heures);
      return Promise.resolve({ items: [commande(1)], totalItems: 51 });
    },
    findAll: (_filter, heures) => {
      calls.heures.push(heures);
      return Promise.resolve([commande(1), commande(2)]);
    },
    listClients: () => Promise.resolve([]),
    heuresParJour: () => Promise.resolve(7.5),
  };
  const spreadsheet: CommandesSpreadsheetPort = {
    build: (rows) => {
      calls.built.push(rows);
      return Promise.resolve(Buffer.from('xlsx'));
    },
  };
  return { useCase: new ListCommandesUseCase(port, spreadsheet), calls };
}

describe('ListCommandesUseCase', () => {
  it('liste une page avec les heures par jour du paramétrage', async () => {
    const { useCase, calls } = setup();
    const result = await useCase.list({ ...filter, page: 2, limit: 50 });
    expect(calls.heures).toEqual([7.5]);
    expect(result.items).toHaveLength(1);
    expect(result.meta).toMatchObject({ page: 2, limit: 50, totalItems: 51 });
  });

  it('exporte toutes les commandes du filtre, fichier daté du jour', async () => {
    const { useCase, calls } = setup();
    const file = await useCase.export(filter, new Date(2026, 9, 30, 23, 30));
    expect(calls.built[0]).toHaveLength(2);
    expect(file.filename).toBe('commandes_2026-10-30.xlsx');
    expect(file.content.toString()).toBe('xlsx');
  });
});
