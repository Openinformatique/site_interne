import { dateLocale, duMois, estDernierJourOuvre } from './fin-de-mois.utils';

const jour = (iso: string) => dateLocale(iso)!;

describe('fin-de-mois.utils', () => {
  it('reconnaît le dernier jour du lundi au vendredi du mois', () => {
    // Octobre 2026 : samedi 31 → vendredi 30.
    expect(estDernierJourOuvre(jour('2026-10-30'))).toBe(true);
    expect(estDernierJourOuvre(jour('2026-10-29'))).toBe(false);
    expect(estDernierJourOuvre(jour('2026-10-31'))).toBe(false);
    // Novembre 2026 : lundi 30.
    expect(estDernierJourOuvre(jour('2026-11-30'))).toBe(true);
    // Mai 2026 : dimanche 31 → vendredi 29.
    expect(estDernierJourOuvre(jour('2026-05-29'))).toBe(true);
  });

  it('ne tient pas compte des fériés', () => {
    // Jeudi 31 décembre 2026 (pas férié) ; lundi 31 août 2026.
    expect(estDernierJourOuvre(jour('2026-12-31'))).toBe(true);
    expect(estDernierJourOuvre(jour('2026-08-31'))).toBe(true);
  });

  it('élide « de » devant une voyelle', () => {
    expect(duMois(jour('2026-10-30'))).toBe("d'octobre");
    expect(duMois(jour('2026-08-31'))).toBe("d'août");
    expect(duMois(jour('2026-12-31'))).toBe('de décembre');
  });

  it('lit une date AAAA-MM-JJ', () => {
    expect(dateLocale('2026-10-30')?.getDate()).toBe(30);
    expect(dateLocale(null)).toBeNull();
    expect(dateLocale('30/10/2026')).toBeNull();
  });
});
