import { ajouterTag, erreursExport, moisEnCours, moisPrecedent } from './export-cfl.utils';

describe('export format CFL', () => {
  it('période par défaut : mois en cours ; raccourci mois précédent', () => {
    expect(moisEnCours(new Date(2026, 10, 2))).toEqual({ du: '2026-11-01', au: '2026-11-30' });
    expect(moisPrecedent('2026-11-01')).toEqual({ du: '2026-10-01', au: '2026-10-31' });
    expect(moisPrecedent('2026-01-01')).toEqual({ du: '2025-12-01', au: '2025-12-31' });
  });

  it('période et client obligatoires', () => {
    expect(erreursExport('2026-10-01', '2026-10-31', 9)).toEqual({});
    expect(erreursExport('2026-10-31', '2026-10-01', 9)).toEqual({ periode: 'La date de fin doit suivre la date de début.' });
    expect(erreursExport('', '2026-10-01', null)).toEqual({ periode: 'Période obligatoire.', client: 'Choisissez un client.' });
    expect(erreursExport('2025-01-01', '2026-01-01', 9)).toEqual({});
    expect(erreursExport('2025-01-01', '2026-01-02', 9)['periode']).toBe('La période est limitée à un an.');
  });

  it('ajoute un tag du paramétrage ou libre, sans doublon', () => {
    const catalogue = ['UP - Visite', 'DOTF / UP - Production'];
    expect(ajouterTag([], 'up - visite', catalogue)).toEqual(['UP - Visite']);
    expect(ajouterTag(['UP - Visite'], 'UP - VISITE', catalogue)).toEqual(['UP - Visite']);
    expect(ajouterTag([], ' [Libre] ', catalogue)).toEqual(['Libre']);
    expect(ajouterTag(['A'], '  ', catalogue)).toEqual(['A']);
  });
});
