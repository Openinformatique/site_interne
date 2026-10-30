import { Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';
import type {
  CommandeListItem,
  CommandesSpreadsheetPort,
} from '../domain/commande-list.port';

const DATE_FORMAT = 'dd/mm/yyyy';
const JOURS_FORMAT = '0.####';
const MONTANT_FORMAT = '#,##0.00 "€"';

/**
 * Colonnes du classeur : celles du tableau de l'écran, statut et date de
 * clôture séparés. Dates, jours et montants sont de vraies valeurs Excel.
 */
const COLUMNS: {
  header: string;
  width: number;
  numFmt?: string;
  value: (commande: CommandeListItem) => string | number | Date | null;
}[] = [
  { header: 'Client', width: 34, value: (c) => c.client },
  { header: 'Code client', width: 14, value: (c) => c.codeClient },
  { header: 'Groupe', width: 14, value: (c) => c.groupeLibelle },
  {
    header: 'Date commande',
    width: 14,
    numFmt: DATE_FORMAT,
    value: (c) => toDate(c.dateCommande),
  },
  { header: 'N° commande', width: 18, value: (c) => c.numeroCommande },
  { header: 'N° devis', width: 12, value: (c) => c.numeroDevis },
  {
    header: 'Date devis',
    width: 12,
    numFmt: DATE_FORMAT,
    value: (c) => toDate(c.dateDevis),
  },
  {
    header: 'Délai',
    width: 12,
    numFmt: DATE_FORMAT,
    value: (c) => toDate(c.delai),
  },
  { header: 'Libellé', width: 60, value: (c) => c.libelle },
  {
    header: 'Jours prévus',
    width: 12,
    numFmt: JOURS_FORMAT,
    value: (c) => c.joursPrevus,
  },
  {
    header: 'Jours passés',
    width: 12,
    numFmt: JOURS_FORMAT,
    value: (c) => c.joursPasses,
  },
  {
    header: 'Jours commandés',
    width: 15,
    numFmt: JOURS_FORMAT,
    value: (c) => c.joursCommandes,
  },
  {
    header: 'Montant',
    width: 15,
    numFmt: MONTANT_FORMAT,
    value: (c) => c.montant,
  },
  {
    header: 'Statut',
    width: 11,
    value: (c) => (c.dateCloture ? 'Clôturée' : 'En cours'),
  },
  {
    header: 'Date de clôture',
    width: 15,
    numFmt: DATE_FORMAT,
    value: (c) => toDate(c.dateCloture),
  },
];

/** Adaptateur exceljs du port CommandesSpreadsheetPort. */
@Injectable()
export class ExcelJsCommandesSpreadsheet implements CommandesSpreadsheetPort {
  async build(commandes: CommandeListItem[]): Promise<Buffer> {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Commandes', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    sheet.columns = COLUMNS.map((column) => ({
      header: column.header,
      width: column.width,
      style: column.numFmt ? { numFmt: column.numFmt } : {},
    }));
    sheet.getRow(1).font = { bold: true };
    commandes.forEach((commande) =>
      sheet.addRow(COLUMNS.map((column) => column.value(commande))),
    );
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: COLUMNS.length },
    };
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}

/** Date ISO (AAAA-MM-JJ) → date Excel (minuit UTC, sans décalage horaire). */
function toDate(iso: string | null): Date | null {
  return iso ? new Date(`${iso}T00:00:00Z`) : null;
}
