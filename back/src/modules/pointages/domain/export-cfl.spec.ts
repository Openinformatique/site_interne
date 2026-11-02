import {
  ExportCflCriteres,
  ExportCflPointage,
  lignesExport,
  pointageRetenu,
  tagsDe,
} from './export-cfl';

const pointage = (
  patch: Partial<ExportCflPointage> = {},
): ExportCflPointage => ({
  debut: new Date('2026-10-01T07:00:00Z'),
  fin: new Date('2026-10-01T08:30:00Z'),
  jour: '2026-10-01',
  utilisateurId: 'AAAA-1',
  salarie: 'JV',
  contact: 'SEGUIN,Néphéli',
  commandeId: 1,
  typeAction: 'ASSC',
  description: '[DOTF / UP - Production] Smartcorail : ajustement',
  ...patch,
});

const tous: ExportCflCriteres = {
  du: '2026-10-01',
  au: '2026-10-31',
  clientId: 9,
  commandeId: null,
  utilisateurId: null,
  typeAction: null,
  tags: [],
  sansTag: false,
};

describe('export format CFL', () => {
  it('lit les tags en tête de description', () => {
    expect(tagsDe('[A] [ Suivi projet ] texte [pas un tag]')).toEqual([
      'A',
      'Suivi projet',
    ]);
    expect(tagsDe('Texte seul')).toEqual([]);
    expect(tagsDe(null)).toEqual([]);
  });

  it('filtre période (jours à Paris, bornes incluses), commande, personne, type', () => {
    expect(pointageRetenu(pointage(), tous)).toBe(true);
    expect(pointageRetenu(pointage({ jour: '2026-11-01' }), tous)).toBe(false);
    expect(pointageRetenu(pointage(), { ...tous, commandeId: 2 })).toBe(false);
    expect(
      pointageRetenu(pointage(), { ...tous, utilisateurId: 'aaaa-1' }),
    ).toBe(true);
    expect(pointageRetenu(pointage(), { ...tous, typeAction: 'DEVIS' })).toBe(
      false,
    );
  });

  it('tags : au moins un, sans casse ni accents ; ou uniquement sans tag', () => {
    expect(
      pointageRetenu(pointage(), {
        ...tous,
        tags: ['dotf / up - production', 'Autre'],
      }),
    ).toBe(true);
    expect(pointageRetenu(pointage(), { ...tous, tags: ['Autre'] })).toBe(
      false,
    );
    expect(pointageRetenu(pointage(), { ...tous, sansTag: true })).toBe(false);
    expect(
      pointageRetenu(pointage({ description: 'Réunion' }), {
        ...tous,
        sansTag: true,
      }),
    ).toBe(true);
  });

  it('lignes du plus récent au plus ancien, durée en minutes', () => {
    const lignes = lignesExport(
      [
        pointage(),
        pointage({
          debut: new Date('2026-10-02T07:00:00Z'),
          fin: new Date('2026-10-02T07:45:00Z'),
          jour: '2026-10-02',
        }),
      ],
      tous,
    );
    expect(lignes.map((l) => [l.date, l.minutes])).toEqual([
      ['02/10/2026', 45],
      ['01/10/2026', 90],
    ]);
    expect(lignes[0]?.demandeur).toBe('SEGUIN Néphéli');
  });
});
