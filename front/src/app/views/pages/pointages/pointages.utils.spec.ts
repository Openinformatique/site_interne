import { couleurType, joinTags, libellePeriode, lundiDe, numeroSemaine, splitTags, titrePointage, toInstant } from './pointages.utils';

describe('pointages.utils', () => {
  it('sépare les tags en tête de la description', () => {
    expect(splitTags('[DOTF / UP - Production] [Libre] Smartcorail : ajustement')).toEqual({
      tags: ['DOTF / UP - Production', 'Libre'],
      texte: 'Smartcorail : ajustement',
    });
    expect(splitTags('Texte [pas un tag]')).toEqual({ tags: [], texte: 'Texte [pas un tag]' });
    expect(splitTags(null)).toEqual({ tags: [], texte: '' });
  });

  it('recompose la description', () => {
    expect(joinTags(['A', 'B'], ' texte ')).toBe('[A] [B] texte');
    expect(joinTags([], '')).toBe('');
  });

  it('titre du bloc : commande, client court et durée', () => {
    expect(titrePointage({ clientId: 1, clientCode: 'CARGO RAIL', clientNom: 'CARGO RAIL S.A.', commandeNumero: 'CORAIL' }, 2)).toBe('[ CORAIL ] CARGO RAIL ( 2 h )');
    expect(titrePointage({ clientId: null, clientCode: null, clientNom: null, commandeNumero: null }, 1.5)).toBe('INTERNE ( 1,5 h )');
  });

  it('semaines : lundi, numéro ISO et libellé', () => {
    expect(lundiDe(new Date(2026, 10, 1)).getDate()).toBe(26);
    expect(numeroSemaine(new Date(2026, 9, 26))).toBe(44);
    expect(numeroSemaine(new Date(2027, 0, 1))).toBe(53);
    expect(libellePeriode(new Date(2026, 9, 26), new Date(2026, 9, 30))).toBe('du 26 au 30 octobre 2026');
    expect(libellePeriode(new Date(2026, 8, 28), new Date(2026, 9, 2))).toBe('du 28 septembre au 2 octobre 2026');
  });

  it('fin de créneau à minuit = lendemain', () => {
    expect(toInstant('2026-10-27', '00:00', true)?.getDate()).toBe(28);
    expect(toInstant('2026-10-27', '08:15')?.getHours()).toBe(8);
    expect(toInstant('', '08:15')).toBeNull();
  });

  it('couleur du type', () => {
    expect(couleurType('255, 153,153')).toBe('rgb(255,153,153)');
    expect(couleurType(null)).toBe('rgb(121,135,161)');
  });
});
