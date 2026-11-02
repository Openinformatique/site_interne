import { segments } from './surlignage';

const rendu = (texte: string, termes: string[]) =>
  segments(texte, termes)
    .map((s) => (s.surligne ? `[${s.texte}]` : s.texte))
    .join('');

describe('segments', () => {
  it('surligne sans tenir compte de la casse ni des accents', () => {
    expect(rendu('CoRail / AMO : contrat CORAIL', ['corail'])).toBe('[CoRail] / AMO : contrat [CORAIL]');
    expect(rendu('Réponse à Jérémy', ['jeremy'])).toBe('Réponse à [Jérémy]');
  });

  it('surligne plusieurs termes et fusionne les morceaux contigus', () => {
    expect(rendu('CFL CARGO LUX', ['cfl', 'cargo'])).toBe('[CFL] [CARGO] LUX');
    expect(rendu('abcabc', ['abc'])).toBe('[abcabc]');
  });

  it('renvoie le texte tel quel sans terme, rien pour un texte vide', () => {
    expect(rendu('Texte', [])).toBe('Texte');
    expect(segments(null, ['x'])).toEqual([]);
  });
});
