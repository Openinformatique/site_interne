import { avancement, decimalText, fichierFormat, formatTaille, parseDecimal } from './commande-fiche.utils';

describe('commande-fiche.utils', () => {
  it('avancement : bleu, orange à 80 %, rouge au-delà des jours prévus', () => {
    expect(avancement(10, 30).niveau).toBe('ok');
    expect(avancement(24, 30).niveau).toBe('alerte');
    expect(avancement(30, 30).niveau).toBe('alerte');
    const over = avancement(34.25, 30);
    expect(over.niveau).toBe('depassement');
    expect(over.depassement).toBeCloseTo(4.25);
    expect(avancement(5, 0)).toEqual({ pourcentage: null, niveau: 'aucun', depassement: 0 });
  });

  it('saisie décimale avec virgule, vide ou invalide → null', () => {
    expect(parseDecimal('1 500,5')).toBe(1500.5);
    expect(parseDecimal('2.25')).toBe(2.25);
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('-1')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
    expect(decimalText(0.0625)).toBe('0,0625');
    expect(decimalText(null)).toBe('');
  });

  it('format des documents d’après le type MIME', () => {
    expect(fichierFormat('application/pdf', 'Devis.pdf')).toEqual({ extension: 'PDF', famille: 'pdf' });
    expect(fichierFormat('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'p.xlsx').famille).toBe('excel');
    expect(fichierFormat('image/png', 'schema.png').famille).toBe('image');
    expect(fichierFormat('application/zip', null)).toEqual({ extension: 'FICHIER', famille: 'autre' });
  });

  it('taille lisible', () => {
    expect(formatTaille(512)).toBe('512 o');
    expect(formatTaille(250_880)).toBe('245 Ko');
    expect(formatTaille(1_258_291)).toBe('1,2 Mo');
  });
});
