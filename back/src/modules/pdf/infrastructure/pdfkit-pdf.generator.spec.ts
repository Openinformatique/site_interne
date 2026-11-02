import { ResourceNotFoundException } from '../../../common/exceptions/app-exceptions';
import {
  PDF_TEMPLATE_SUIVI_CONTRAT,
  PDF_TEMPLATE_TECHNICAL_DEMO,
  SuiviContratPdfData,
  TechnicalDemoPdfData,
} from '../domain/pdf-generator.port';
import { PdfKitPdfGenerator } from './pdfkit-pdf.generator';

describe('PdfKitPdfGenerator', () => {
  const generator = new PdfKitPdfGenerator();
  const demoData: TechnicalDemoPdfData = {
    generatedAt: new Date('2026-07-14T08:30:00.000Z'),
    userId: 'user-42',
    requestId: 'req-123',
  };

  it('génère un buffer non vide', async () => {
    const pdf = await generator.generate(PDF_TEMPLATE_TECHNICAL_DEMO, demoData);

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(500);
  });

  it('produit un fichier commençant par la signature PDF (%PDF-)', async () => {
    const pdf = await generator.generate(PDF_TEMPLATE_TECHNICAL_DEMO, demoData);

    expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('génère le suivi de contrat sur plusieurs pages', async () => {
    const data: SuiviContratPdfData = {
      client: 'CLIENT TEST',
      libelleContrat: 'Contrat temps développement',
      credit: 70,
      debit: 54.5,
      solde: 15.5,
      lignes: Array.from({ length: 60 }, (_, i) => ({
        date: '01/05/2024',
        demandeur: i === 59 ? '' : 'DUPONT Jean',
        nature: i === 59 ? 'Ajout de 48 heures' : `Intervention ${i}`,
        debit: i === 59 ? 0 : 0.75,
        credit: i === 59 ? 1048 : 0,
        commande: i === 59,
      })),
      editeLe: '02/11/2026',
    };

    const pdf = await generator.generate(PDF_TEMPLATE_SUIVI_CONTRAT, data);

    expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    // Plusieurs pages : une entrée /Type /Page par page.
    expect(
      pdf.toString('latin1').match(/\/Type \/Page\b/g)?.length,
    ).toBeGreaterThan(1);
  });

  it('rejette un gabarit inconnu', async () => {
    await expect(generator.generate('gabarit-inexistant', {})).rejects.toThrow(
      ResourceNotFoundException,
    );
  });
});
