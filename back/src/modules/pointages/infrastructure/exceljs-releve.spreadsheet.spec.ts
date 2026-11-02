import { Workbook } from 'exceljs';
import type { Releve } from '../domain/releve-mensuel';
import { ExcelJsReleveSpreadsheet } from './exceljs-releve.spreadsheet';

describe('ExcelJsReleveSpreadsheet', () => {
  const releve: Releve = {
    total: 3.5,
    clients: 2.5,
    interne: 1,
    absences: 0,
    groupes: [
      {
        client: 'CFL',
        heures: 2.5,
        types: [
          {
            libelle: 'Assistance sur contrat',
            couleur: '153,204,255',
            heures: 2.5,
            commandes: [
              {
                numero: 'CORAIL',
                heures: 2.5,
                lignes: [
                  { description: 'COPRO', heures: 2, facturable: 'non' },
                  { description: 'Ticket', heures: 0.5, facturable: 'attente' },
                ],
              },
            ],
          },
        ],
      },
      {
        client: 'INTERNE',
        heures: 1,
        types: [
          {
            libelle: 'Autre',
            couleur: null,
            heures: 1,
            commandes: [
              {
                numero: null,
                heures: 1,
                lignes: [
                  { description: 'Point IA', heures: 1, facturable: 'oui' },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  it('écrit une ligne filtrable par description, puis le total', async () => {
    const buffer = await new ExcelJsReleveSpreadsheet().build(
      'Relevé — JV',
      releve,
    );
    const workbook = new Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = workbook.getWorksheet('Relevé')!;

    expect(sheet.getCell('A1').value).toBe('Relevé — JV');
    expect(sheet.getRow(3).values).toEqual([
      undefined,
      'Client',
      "Type d'action",
      'N° cde',
      'Description',
      'Temps (h)',
      'Facturable',
    ]);
    expect(sheet.getRow(4).values).toEqual([
      undefined,
      'CFL',
      'Assistance sur contrat',
      'CORAIL',
      'COPRO',
      2,
      'Non',
    ]);
    expect(sheet.getRow(5).getCell(6).value).toBe('En attente');
    expect(sheet.getRow(6).getCell(3).value).toBe('');
    expect(sheet.getRow(7).getCell(1).value).toBe('Total temps de travail');
    expect(sheet.getRow(7).getCell(5).value).toMatchObject({
      formula: 'SUM(E4:E6)',
      result: 3.5,
    });
  });
});
