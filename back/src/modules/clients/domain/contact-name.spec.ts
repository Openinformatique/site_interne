import { joinNomContact, splitNomContact } from './contact-name';

describe('Nom de contact « NOM,Prénom »', () => {
  it('découpe le nom et le prénom', () => {
    expect(splitNomContact('ORDONEZ,Jacky')).toEqual({
      nom: 'ORDONEZ',
      prenom: 'Jacky',
    });
  });

  it('accepte un nom seul (sans virgule ou prénom vide)', () => {
    expect(splitNomContact('DUPONT')).toEqual({ nom: 'DUPONT', prenom: null });
    expect(splitNomContact('DUPONT, ')).toEqual({
      nom: 'DUPONT',
      prenom: null,
    });
    expect(splitNomContact(null)).toEqual({ nom: '', prenom: null });
  });

  it('recompose en forçant le nom en majuscules', () => {
    expect(joinNomContact(' Seguin ', ' Néphéli ')).toBe('SEGUIN,Néphéli');
    expect(joinNomContact('kremer', null)).toBe('KREMER');
  });

  it('fait un aller-retour sans perte', () => {
    expect(splitNomContact(joinNomContact('Maraldi', 'Michael'))).toEqual({
      nom: 'MARALDI',
      prenom: 'Michael',
    });
  });
});
