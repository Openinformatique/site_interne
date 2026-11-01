import { ValidationException } from '../../../common/exceptions/app-exceptions';
import type {
  Parametre,
  ParametreAdminPort,
  RubriquesChange,
  TableParametres,
} from '../domain/parametre-admin.port';
import { ParametresAdminUseCase } from './parametres-admin.use-case';

const table: TableParametres = {
  code: 'TYPA',
  nom: "Types d'action",
  nomCle: 'Code action',
  tailleCle: 8,
  aide: '',
  codeDansCombo: false,
  rubriques: [
    { num: '01', nom: 'Libellé', aide: '', nbValeurs: 2 },
    { num: '02', nom: 'Couleur', aide: '', nbValeurs: 2 },
    { num: '03', nom: 'Ordre', aide: '', nbValeurs: 1 },
  ],
  nbParametres: 2,
};

const devis: Parametre = {
  cle: 'DEVIS',
  actif: true,
  valeurs: { '01': 'Devis' },
};

function setup(utilisations = 0) {
  const calls: { change?: RubriquesChange; deleted: string[] } = {
    deleted: [],
  };
  const admin = {
    findTable: () => Promise.resolve(table),
    longueurMaxCle: () => Promise.resolve(5),
    updateTable: (_c: string, _i: unknown, change: RubriquesChange) => {
      calls.change = change;
      return Promise.resolve();
    },
    findParametre: () => Promise.resolve(devis),
    countUtilisations: () => Promise.resolve(utilisations),
    deleteParametre: (_c: string, cle: string) => {
      calls.deleted.push(cle);
      return Promise.resolve();
    },
  } as unknown as ParametreAdminPort;
  return { useCase: new ParametresAdminUseCase(admin), calls };
}

const input = {
  nom: 'T',
  nomCle: 'Code',
  tailleCle: 8,
  aide: '',
  codeDansCombo: false,
};

async function fields(promise: Promise<unknown>): Promise<string[]> {
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

describe('ParametresAdminUseCase', () => {
  it('renumérote les rubriques et liste celles supprimées', async () => {
    const { useCase, calls } = setup();
    await useCase.updateTable(
      'typa',
      {
        ...input,
        rubriques: [
          { ancienNum: '01', nom: 'Libellé', aide: '' },
          { ancienNum: '03', nom: 'Ordre', aide: '' },
          { ancienNum: null, nom: 'Nouvelle', aide: '' },
        ],
      },
      'u',
    );
    expect(calls.change?.renumerotation).toEqual({ '01': '01', '03': '02' });
    expect(calls.change?.supprimees).toEqual(['02']);
    expect(calls.change?.rubriques.map((rubrique) => rubrique.num)).toEqual([
      '01',
      '02',
      '03',
    ]);
  });

  it('refuse de retirer la rubrique 01 ou de réduire la taille sous les clés existantes', async () => {
    const { useCase } = setup();
    expect(
      await fields(
        useCase.updateTable(
          'TYPA',
          { ...input, rubriques: [{ ancienNum: '02', nom: 'C', aide: '' }] },
          'u',
        ),
      ),
    ).toEqual(['rubriques']);
    expect(
      await fields(
        useCase.updateTable(
          'TYPA',
          {
            ...input,
            tailleCle: 4,
            rubriques: [{ ancienNum: '01', nom: 'L', aide: '' }],
          },
          'u',
        ),
      ),
    ).toEqual(['tailleCle']);
  });

  it('refuse de supprimer un paramètre utilisé ailleurs', async () => {
    const { useCase, calls } = setup(3);
    expect(await fields(useCase.deleteParametre('TYPA', 'DEVIS'))).toEqual([
      'cle',
    ]);
    expect(calls.deleted).toEqual([]);
  });

  it('supprime un paramètre inutilisé', async () => {
    const { useCase, calls } = setup(0);
    await useCase.deleteParametre('TYPA', 'DEVIS');
    expect(calls.deleted).toEqual(['DEVIS']);
  });

  it('refuse de supprimer une table qui contient des paramètres', async () => {
    const { useCase } = setup();
    expect(await fields(useCase.deleteTable('TYPA'))).toEqual(['code']);
  });
});
