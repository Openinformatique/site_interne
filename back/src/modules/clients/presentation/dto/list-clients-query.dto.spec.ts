import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListClientsQueryDto } from './list-clients-query.dto';

/** Simule la transformation + validation opérée par le ValidationPipe. */
const buildAndValidate = (
  query: Record<string, string>,
): { dto: ListClientsQueryDto; errors: string[] } => {
  const dto = plainToInstance(ListClientsQueryDto, query);
  const errors = validateSync(dto).map((error) => error.property);
  return { dto, errors };
};

describe('ListClientsQueryDto', () => {
  it('accepte une requête vide (valeurs par défaut gérées par le contrôleur)', () => {
    const { dto, errors } = buildAndValidate({});

    expect(errors).toHaveLength(0);
    expect(dto.sortBy).toBeUndefined();
    expect(dto.includeInactive).toBeUndefined();
    expect(dto.groupes).toBeUndefined();
  });

  it('convertit includeInactive et sansGroupe en booléens', () => {
    const { dto, errors } = buildAndValidate({
      includeInactive: 'true',
      sansGroupe: 'false',
    });

    expect(errors).toHaveLength(0);
    expect(dto.includeInactive).toBe(true);
    expect(dto.sansGroupe).toBe(false);
  });

  it('rejette un booléen mal formé', () => {
    expect(buildAndValidate({ includeInactive: 'oui' }).errors).toContain(
      'includeInactive',
    );
  });

  it('découpe les groupes séparés par des virgules (espaces et vides ignorés)', () => {
    const { dto, errors } = buildAndValidate({ groupes: ' CFL , ,ABC ' });

    expect(errors).toHaveLength(0);
    expect(dto.groupes).toEqual(['CFL', 'ABC']);
  });

  it("n'accepte que les colonnes de tri de la liste blanche", () => {
    expect(buildAndValidate({ sortBy: 'ville' }).errors).toHaveLength(0);
    expect(buildAndValidate({ sortBy: 'numeroTva' }).errors).toContain(
      'sortBy',
    );
    expect(buildAndValidate({ sortBy: 'password_hash' }).errors).toContain(
      'sortBy',
    );
  });
});
