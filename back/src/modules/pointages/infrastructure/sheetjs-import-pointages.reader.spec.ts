import { utils, write } from 'xlsx';
import { lireJour } from '../domain/import-pointages';
import { SheetJsImportPointagesReader } from './sheetjs-import-pointages.reader';

const ENTETES = [
  'Client',
  'Type de tâche',
  'Thème',
  'Devis',
  'Date',
  'Durée',
  'Observations',
  'Contact',
];

function classeur(bookType: 'xlsx' | 'biff8'): Buffer {
  const feuille = utils.aoa_to_sheet(
    [
      ENTETES,
      [
        'ALPHI',
        'ASSC',
        null,
        'ASSISTANCE',
        new Date(2026, 9, 26),
        0.5,
        'Clôture',
        'GIRARD Magali',
      ],
      [],
      [null, 'AUTRE', null, null, '30/10/2026', 1.5, 'Relevé', null],
    ],
    { cellDates: true },
  );
  const wb = utils.book_new();
  utils.book_append_sheet(wb, feuille, 'A');
  return write(wb, { type: 'buffer', bookType }) as Buffer;
}

describe('SheetJsImportPointagesReader', () => {
  const reader = new SheetJsImportPointagesReader();

  it.each(['xlsx', 'biff8'] as const)(
    'lit un classeur %s : en-têtes, lignes numérotées depuis 2, dates',
    async (format) => {
      const lu = await reader.lire(classeur(format));

      expect(lu?.entetes.slice(0, 8)).toEqual(ENTETES);
      expect(lu?.lignes.map((l) => l.numero)).toEqual([2, 3, 4]);
      const [premiere, vide, derniere] = lu!.lignes;
      expect(premiere!.cellules.slice(0, 4)).toEqual([
        'ALPHI',
        'ASSC',
        null,
        'ASSISTANCE',
      ]);
      expect(lireJour(premiere!.cellules[4]!)).toBe('2026-10-26');
      expect(premiere!.cellules[5]).toBe(0.5);
      expect(vide!.cellules.every((c) => c === null)).toBe(true);
      expect(lireJour(derniere!.cellules[4]!)).toBe('2026-10-30');
    },
  );

  it("renvoie null pour un fichier qui n'est pas un classeur", async () => {
    expect(await reader.lire(Buffer.from('pas un classeur'))).toBeNull();
  });
});
