import { joursIncomplets } from './alertes-pointage';

// Novembre / fin octobre : Paris = UTC+1 (UTC+2 jusqu'au 24/10).
const pointage = (debut: string, fin: string) => ({
  debut: new Date(debut),
  fin: new Date(fin),
});

// Aujourd'hui : lundi 2 novembre 2026 ; fenêtre du 19 au 30 octobre (10 jours ouvrés).
const AUJOURDHUI = '2026-11-02';

describe('joursIncomplets', () => {
  it('liste les jours ouvrés sans pointage, du plus récent au plus ancien', () => {
    const jours = joursIncomplets([], AUJOURDHUI);
    expect(jours.map((j) => j.jour)).toEqual([
      '2026-10-30',
      '2026-10-29',
      '2026-10-28',
      '2026-10-27',
      '2026-10-26',
      '2026-10-23',
      '2026-10-22',
      '2026-10-21',
      '2026-10-20',
      '2026-10-19',
    ]);
    expect(jours[0]).toEqual({
      jour: '2026-10-30',
      heures: 0,
      manquantes: 7,
      joursEcoules: 3,
    });
  });

  it('cumule les pointages du jour et écarte les jours à 7 h ou plus', () => {
    const jours = joursIncomplets(
      [
        // 30/10 : 8 h – 12 h et 13 h – 16 h à Paris = 7 h.
        pointage('2026-10-30T07:00:00Z', '2026-10-30T11:00:00Z'),
        pointage('2026-10-30T12:00:00Z', '2026-10-30T15:00:00Z'),
        // 29/10 : 3 h 30.
        pointage('2026-10-29T07:00:00Z', '2026-10-29T10:30:00Z'),
      ],
      AUJOURDHUI,
    );
    expect(jours.find((j) => j.jour === '2026-10-30')).toBeUndefined();
    expect(jours[0]).toMatchObject({
      jour: '2026-10-29',
      heures: 3.5,
      manquantes: 3.5,
    });
  });

  it('situe le pointage dans son jour à Paris et ignore aujourd’hui', () => {
    const jours = joursIncomplets(
      [
        // 23 h 30 UTC le 29/10 = 00 h 30 le 30/10 à Paris.
        pointage('2026-10-29T23:30:00Z', '2026-10-30T06:30:00Z'),
        pointage('2026-11-02T07:00:00Z', '2026-11-02T08:00:00Z'),
      ],
      AUJOURDHUI,
    );
    expect(jours.find((j) => j.jour === '2026-10-30')).toBeUndefined();
    expect(jours.some((j) => j.jour === '2026-11-02')).toBe(false);
  });
});
