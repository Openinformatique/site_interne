import {
  dateToUtcText,
  jourMetier,
  sqlDateToIso,
  utcTextToDate,
} from './sql-date.util';

describe('sqlDateToIso', () => {
  it('garde le jour d’une date à minuit heure locale', () => {
    expect(sqlDateToIso(new Date(2026, 9, 20))).toBe('2026-10-20');
  });

  it('tronque une chaîne ISO et laisse passer null', () => {
    expect(sqlDateToIso('2026-10-20T00:00:00')).toBe('2026-10-20');
    expect(sqlDateToIso(null)).toBeNull();
  });
});

describe('instants UTC (datetime2)', () => {
  it('lit le texte SQL comme un instant UTC et le réécrit à l’identique', () => {
    const instant = utcTextToDate('2026-10-26T07:00:00');
    expect(instant.toISOString()).toBe('2026-10-26T07:00:00.000Z');
    expect(dateToUtcText(instant)).toBe('2026-10-26 07:00:00.000');
  });

  it('situe un instant dans le jour de Paris', () => {
    // 23 h 30 UTC = 0 h 30 le lendemain à Paris (hiver), 1 h 30 en été.
    expect(jourMetier(utcTextToDate('2026-10-26T23:30:00'))).toBe('2026-10-27');
    expect(jourMetier(utcTextToDate('2026-07-01T22:30:00'))).toBe('2026-07-02');
    expect(jourMetier(utcTextToDate('2026-10-26T07:00:00'))).toBe('2026-10-26');
  });
});
