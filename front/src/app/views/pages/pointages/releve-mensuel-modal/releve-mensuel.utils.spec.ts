import { Pointage } from '../../../../core/models/pointage.model';
import { bornesMois, moisProposes, NB_MOIS, recapitulatif } from './releve-mensuel.utils';

const pointage = (debut: Date, heures: number, clientId: number | null): Pointage =>
  ({ debut: debut.toISOString(), fin: new Date(debut.getTime() + heures * 3_600_000).toISOString(), clientId }) as Pointage;

describe('relevé mensuel (modale)', () => {
  it('propose les 24 derniers mois, mois en cours en tête', () => {
    const mois = moisProposes(new Date(2026, 10, 2));
    expect(mois).toHaveLength(NB_MOIS);
    expect(mois[0]).toEqual({ cle: '2026-11', annee: 2026, mois: 11, libelle: 'Novembre 2026' });
    expect(mois[2]?.libelle).toBe('Septembre 2026');
    expect(mois[23]?.cle).toBe('2024-12');
  });

  it('borne le mois en heure locale', () => {
    const { du, au } = bornesMois(2026, 12);
    expect(du).toEqual(new Date(2026, 11, 1));
    expect(au).toEqual(new Date(2027, 0, 1));
  });

  it('résume les pointages commençant dans le mois', () => {
    const pointages = [
      pointage(new Date(2026, 8, 2, 8), 3, 1),
      pointage(new Date(2026, 8, 3, 8), 1.25, 2),
      pointage(new Date(2026, 8, 4, 8), 1, null),
      pointage(new Date(2026, 9, 1, 8), 5, 1),
    ];
    expect(recapitulatif(pointages, 2026, 9)).toEqual({
      vide: false,
      texte: '5,25 h pointées en septembre 2026 · 2 clients · 3 pointages',
    });
    expect(recapitulatif([], 2026, 9)).toEqual({ vide: true, texte: 'Aucun pointage en septembre 2026.' });
  });
});
