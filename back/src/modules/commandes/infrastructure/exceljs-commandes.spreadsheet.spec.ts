import { Workbook } from 'exceljs';
import type { CommandeListItem } from '../domain/commande-list.port';
import { ExcelJsCommandesSpreadsheet } from './exceljs-commandes.spreadsheet';

const closed: CommandeListItem = {
  id: 1,
  clientId: 3,
  codeClient: 'CARGO',
  client: 'CARGO RAIL',
  groupe: 'CFL',
  groupeLibelle: 'Groupe CFL',
  dateCommande: '2023-10-30',
  numeroCommande: '23/341',
  numeroDevis: '23/341',
  dateDevis: '2023-10-23',
  delai: '2023-12-31',
  libelle: 'Bulletin de freinage',
  joursPrevus: 13,
  joursPasses: 12.5,
  joursCommandes: 18,
  montant: 11700.5,
  dateCloture: '2024-02-20',
};

describe('ExcelJsCommandesSpreadsheet', () => {
  it('écrit les colonnes de la liste avec des dates et nombres typés', async () => {
    const buffer = await new ExcelJsCommandesSpreadsheet().build([
      closed,
      { ...closed, id: 2, dateCloture: null, montant: null, delai: null },
    ]);

    const workbook = new Workbook();
    await workbook.xlsx.load(
      buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
    );
    const sheet = workbook.getWorksheet('Commandes')!;
    const header = sheet.getRow(1).values as unknown[];
    expect(header.slice(1)).toEqual([
      'Client',
      'Code client',
      'Groupe',
      'Date commande',
      'N° commande',
      'N° devis',
      'Date devis',
      'Délai',
      'Libellé',
      'Jours prévus',
      'Jours passés',
      'Jours commandés',
      'Montant',
      'Statut',
      'Date de clôture',
    ]);

    const row = sheet.getRow(2);
    expect(row.getCell(3).value).toBe('Groupe CFL');
    expect(row.getCell(4).value).toEqual(new Date('2023-10-30T00:00:00Z'));
    expect(row.getCell(11).value).toBe(12.5);
    expect(row.getCell(13).value).toBe(11700.5);
    expect(row.getCell(14).value).toBe('Clôturée');
    expect(row.getCell(15).value).toEqual(new Date('2024-02-20T00:00:00Z'));

    const open = sheet.getRow(3);
    expect(open.getCell(14).value).toBe('En cours');
    expect(open.getCell(15).value).toBeNull();
    expect(sheet.rowCount).toBe(3);
  });
});
