import { sqlDateToIso } from './sql-date.util';

describe('sqlDateToIso', () => {
  it('garde le jour d’une date à minuit heure locale', () => {
    expect(sqlDateToIso(new Date(2026, 9, 20))).toBe('2026-10-20');
  });

  it('tronque une chaîne ISO et laisse passer null', () => {
    expect(sqlDateToIso('2026-10-20T00:00:00')).toBe('2026-10-20');
    expect(sqlDateToIso(null)).toBeNull();
  });
});
