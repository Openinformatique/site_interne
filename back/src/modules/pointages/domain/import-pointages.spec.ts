import {
  controlerEntetes,
  horaires,
  instantParis,
  lireHeures,
  lireJour,
  lireLigne,
} from './import-pointages';

const ENTETES = [
  'Client',
  'Type de tâche',
  'Thème',
  'Devis',
  'Date',
  'Durée',
  'Observations',
  'Contact',
];

describe('import-pointages', () => {
  it('accepte les en-têtes attendus, casse, accents et espaces indifférents', () => {
    expect(controlerEntetes(ENTETES).conforme).toBe(true);
    expect(
      controlerEntetes([
        ' CLIENT ',
        'type de tache',
        'theme',
        'devis',
        'DATE',
        'duree',
        'observations',
        'contact',
      ]).conforme,
    ).toBe(true);
  });

  it('signale les colonnes inversées, manquantes ou en trop', () => {
    const inversees = controlerEntetes([
      'Client',
      'Type de tâche',
      'Devis',
      'Thème',
      'Date',
      'Durée',
      'Observations',
    ]);
    expect(inversees.conforme).toBe(false);
    expect(
      inversees.colonnes.filter((c) => !c.conforme).map((c) => c.lettre),
    ).toEqual(['C', 'D', 'H']);

    const enTrop = controlerEntetes([...ENTETES, null, 'Remarque']);
    expect(enTrop.conforme).toBe(false);
    expect(enTrop.colonnes.at(-1)).toMatchObject({
      lettre: 'J',
      lu: 'Remarque',
    });
  });

  it('lit les dates Excel, les numéros de série et les textes', () => {
    expect(lireJour(new Date(Date.UTC(2026, 9, 26)))).toBe('2026-10-26');
    expect(lireJour(46321)).toBe('2026-10-26');
    expect(lireJour('26/10/2026')).toBe('2026-10-26');
    expect(lireJour('2026-10-26')).toBe('2026-10-26');
    expect(lireJour('31/02/2026')).toBeNull();
    expect(lireJour('demain')).toBeNull();
  });

  it('lit les durées de 0 à 24 h', () => {
    expect(lireHeures(0.67)).toBe(0.67);
    expect(lireHeures('1,5')).toBe(1.5);
    expect(lireHeures(0)).toBeNull();
    expect(lireHeures(25)).toBeNull();
    expect(lireHeures('1h')).toBeNull();
  });

  it('lit une ligne : type en majuscules, tags séparés, erreurs de forme', () => {
    const { ligne, erreurs } = lireLigne({
      numero: 7,
      cellules: [
        'CFL CARGO LUX',
        'assc',
        'Suivi projet ; Production',
        'CORAIL',
        '31/02/2026',
        0,
        'Préparation COPRO',
        'SEGUIN Néphéli',
      ],
    });
    expect(ligne).toMatchObject({
      client: 'CFL CARGO LUX',
      type: 'ASSC',
      tags: ['Suivi projet', 'Production'],
      commande: 'CORAIL',
    });
    expect(erreurs.map((e) => [e.ligne, e.colonne])).toEqual([
      [7, 'E – Date'],
      [7, 'F – Durée'],
    ]);
  });

  it('enchaîne les pointages de chaque jour à partir de 7 h, dans l’ordre du fichier', () => {
    expect(
      horaires([
        { jour: '2026-10-26', heures: 0.5 },
        { jour: '2026-10-27', heures: 2 },
        { jour: '2026-10-26', heures: 2.5 },
        { jour: null, heures: 1 },
      ]),
    ).toEqual([
      { debut: 420, fin: 450 },
      { debut: 420, fin: 540 },
      { debut: 450, fin: 600 },
      null,
    ]);
  });

  it('place 7 h à Paris en UTC, heure d’été comme d’hiver', () => {
    expect(instantParis('2026-10-26', 420).toISOString()).toBe(
      '2026-10-26T06:00:00.000Z',
    );
    expect(instantParis('2026-07-01', 420).toISOString()).toBe(
      '2026-07-01T05:00:00.000Z',
    );
    expect(instantParis('2026-10-26', 460.2).toISOString()).toBe(
      '2026-10-26T06:40:12.000Z',
    );
  });
});
