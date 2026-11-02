import {
  PDF_TEMPLATE_RELEVE_MENSUEL,
  ReleveMensuelPdfData,
} from '../domain/pdf-generator.port';
import { PdfKitPdfGenerator } from './pdfkit-pdf.generator';

describe('relevé mensuel (PDF)', () => {
  const generator = new PdfKitPdfGenerator();
  const data = (synthese: boolean): ReleveMensuelPdfData => ({
    personne: 'Jean DUPONT',
    periode: 'Septembre 2026',
    synthese,
    total: 90,
    clients: 82,
    interne: 4,
    absences: 4,
    groupes: [
      {
        client: 'CLIENT TEST',
        heures: 82,
        types: [
          {
            libelle: 'Assistance sur contrat',
            couleur: '153,204,255',
            heures: 82,
            commandes: [
              {
                numero: 'CONTRAT',
                heures: 82,
                lignes: Array.from({ length: 82 }, (_, i) => ({
                  description: `[Module] Intervention ${i} sur un écran assez long pour passer à la ligne`,
                  heures: 1,
                  facturable:
                    i % 3 === 0 ? 'oui' : i % 3 === 1 ? 'non' : 'attente',
                })),
              },
            ],
          },
        ],
      },
      {
        client: 'INTERNE',
        heures: 8,
        types: [
          {
            libelle: 'Autre',
            couleur: null,
            heures: 4,
            commandes: [
              {
                numero: null,
                heures: 4,
                lignes: [{ description: '', heures: 4, facturable: 'non' }],
              },
            ],
          },
          {
            libelle: 'Congés payés',
            couleur: 'illisible',
            heures: 4,
            commandes: [
              {
                numero: null,
                heures: 4,
                lignes: [{ description: 'CP', heures: 4, facturable: 'non' }],
              },
            ],
          },
        ],
      },
    ],
    editeLe: '02/11/2026',
  });
  const pages = (pdf: Buffer) =>
    pdf.toString('latin1').match(/\/Type \/Page\b/g)?.length ?? 0;

  it('génère le relevé détaillé sur plusieurs pages', async () => {
    const pdf = await generator.generate(
      PDF_TEMPLATE_RELEVE_MENSUEL,
      data(false),
    );

    expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pages(pdf)).toBeGreaterThan(1);
  });

  it('génère la synthèse sur une page', async () => {
    const pdf = await generator.generate(
      PDF_TEMPLATE_RELEVE_MENSUEL,
      data(true),
    );

    expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pages(pdf)).toBe(1);
  });

  it('génère un relevé vide', async () => {
    const vide = {
      ...data(false),
      groupes: [],
      total: 0,
      clients: 0,
      interne: 0,
      absences: 0,
    };
    const pdf = await generator.generate(PDF_TEMPLATE_RELEVE_MENSUEL, vide);

    expect(pages(pdf)).toBe(1);
  });
});
