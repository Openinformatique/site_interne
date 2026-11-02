import { Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';
import type { ReleveFacturable } from '../../pdf/domain/pdf-generator.port';
import type { Releve, ReleveSpreadsheetPort } from '../domain/releve-mensuel';

const HEURES_FORMAT = '0.00';
/** Ligne d'en-tête du tableau (titre en ligne 1, ligne 2 vide). */
const LIGNE_ENTETE = 3;

const COLONNES = [
  { header: 'Client', width: 20 },
  { header: "Type d'action", width: 26 },
  { header: 'N° cde', width: 14 },
  { header: 'Description', width: 90 },
  { header: 'Temps (h)', width: 11, numFmt: HEURES_FORMAT },
  { header: 'Facturable', width: 12 },
];

const FACTURABLE: Record<ReleveFacturable, string> = {
  oui: 'Oui',
  non: 'Non',
  attente: 'En attente',
};

/**
 * Relevé mensuel détaillé en tableau filtrable (maquette validée le
 * 02/11/2026) : une ligne par description cumulée, client / type / commande
 * répétés sur chaque ligne, filtres automatiques, ligne de total en bas
 * (formule SOMME). Ordre des lignes identique au PDF.
 */
@Injectable()
export class ExcelJsReleveSpreadsheet implements ReleveSpreadsheetPort {
  async build(titre: string, releve: Releve): Promise<Buffer> {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Relevé', {
      views: [{ state: 'frozen', ySplit: LIGNE_ENTETE }],
    });
    COLONNES.forEach((colonne, i) => {
      const column = sheet.getColumn(i + 1);
      column.width = colonne.width;
      if (colonne.numFmt) {
        column.numFmt = colonne.numFmt;
      }
    });

    sheet.getCell('A1').value = titre;
    sheet.getCell('A1').font = { bold: true, size: 14 };

    const entete = sheet.getRow(LIGNE_ENTETE);
    entete.values = COLONNES.map((colonne) => colonne.header);
    entete.font = { bold: true };
    entete.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4FB' },
      };
    });

    for (const groupe of releve.groupes) {
      for (const type of groupe.types) {
        for (const commande of type.commandes) {
          for (const ligne of commande.lignes) {
            const row = sheet.addRow([
              groupe.client,
              type.libelle,
              commande.numero ?? '',
              ligne.description,
              ligne.heures,
              FACTURABLE[ligne.facturable],
            ]);
            row.getCell(4).alignment = { wrapText: true, vertical: 'top' };
            row.alignment = { vertical: 'top' };
          }
        }
      }
    }

    const derniere = sheet.rowCount;
    sheet.autoFilter = {
      from: { row: LIGNE_ENTETE, column: 1 },
      to: { row: Math.max(derniere, LIGNE_ENTETE), column: COLONNES.length },
    };

    // Total : formule (suit les corrections faites dans Excel), valeur en cache.
    const total = sheet.addRow([]);
    total.getCell(1).value = 'Total temps de travail';
    total.getCell(5).value =
      derniere > LIGNE_ENTETE
        ? {
            formula: `SUM(E${LIGNE_ENTETE + 1}:E${derniere})`,
            result: releve.total,
          }
        : 0;
    total.font = { bold: true };
    total.eachCell((cell) => {
      cell.border = { top: { style: 'thin' } };
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
