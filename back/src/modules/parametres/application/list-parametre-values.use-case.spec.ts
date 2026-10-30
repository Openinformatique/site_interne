import type { ParametreRepositoryPort } from '../domain/parametre-repository.port';
import { ListParametreValuesUseCase } from './list-parametre-values.use-case';

describe('ListParametreValuesUseCase', () => {
  it('interroge la table en majuscules et renvoie ses valeurs', async () => {
    const tables: string[] = [];
    const repository: ParametreRepositoryPort = {
      findValues: (codeTable) => {
        tables.push(codeTable);
        return Promise.resolve([{ cle: 'FR', libelle: 'France' }]);
      },
    };

    const values = await new ListParametreValuesUseCase(repository).execute(
      'pays',
    );

    expect(tables).toEqual(['PAYS']);
    expect(values).toEqual([{ cle: 'FR', libelle: 'France' }]);
  });
});
