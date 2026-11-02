import { Injectable } from '@nestjs/common';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import { ResourceNotFoundException } from '../../../common/exceptions/app-exceptions';
import {
  PdfGeneratorPort,
  PDF_TEMPLATE_SUIVI_CONTRAT,
  PDF_TEMPLATE_TECHNICAL_DEMO,
  SuiviContratPdfData,
  TechnicalDemoPdfData,
} from '../domain/pdf-generator.port';

/**
 * Générateur PDF local basé sur PDFKit (bibliothèque serveur stable,
 * sans dépendance à un navigateur headless).
 *
 * Chaque gabarit est une méthode privée ; en ajouter un consiste à
 * enregistrer une nouvelle entrée dans le dispatch de generate().
 */
@Injectable()
export class PdfKitPdfGenerator implements PdfGeneratorPort {
  async generate<TData>(template: string, data: TData): Promise<Buffer> {
    if (template === PDF_TEMPLATE_TECHNICAL_DEMO) {
      return this.renderTechnicalDemo(data as TechnicalDemoPdfData);
    }
    if (template === PDF_TEMPLATE_SUIVI_CONTRAT) {
      return this.renderSuiviContrat(data as SuiviContratPdfData);
    }
    throw new ResourceNotFoundException(`Le gabarit PDF "${template}"`);
  }

  /** Collecte le flux PDFKit dans un Buffer. */
  private collect(document: PDFKit.PDFDocument): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);
      document.end();
    });
  }

  private renderTechnicalDemo(data: TechnicalDemoPdfData): Promise<Buffer> {
    const document = new PDFDocument({ size: 'A4', margin: 56 });

    document
      .fontSize(22)
      .text('Document de démonstration technique', { align: 'center' })
      .moveDown(2);

    document
      .fontSize(11)
      .text(`Date de génération : ${data.generatedAt.toISOString()}`)
      .text(`Utilisateur : ${data.userId}`)
      .text(`Request ID : ${data.requestId ?? 'non disponible'}`)
      .moveDown(2);

    document
      .fontSize(14)
      .text('Données fictives', { underline: true })
      .moveDown(0.5);

    // Quelques données fictives non métier, purement illustratives.
    const fakeRows: Array<[string, string]> = [
      ['Référence', 'DEMO-0001'],
      ['Libellé', 'Élément de démonstration'],
      ['Statut', 'Généré par le socle technique'],
      ['Version du gabarit', '1.0'],
    ];
    document.fontSize(11);
    for (const [label, value] of fakeRows) {
      document.text(`${label} : ${value}`);
    }

    document
      .moveDown(3)
      .fontSize(9)
      .fillColor('#666666')
      .text(
        'Document généré automatiquement par nestjs-openinfo — ' +
          'aucune valeur contractuelle.',
        { align: 'center' },
      );

    return this.collect(document);
  }

  /**
   * « Suivi du contrat d'assistance » (maquette validée le 02/11/2026) :
   * en-tête logo + titre, synthèse crédité / débité / solde, tableau encadré
   * (en-tête répété à chaque page, commandes surlignées en vert), pied de page
   * « Édité le … » sur chaque page.
   */
  private renderSuiviContrat(data: SuiviContratPdfData): Promise<Buffer> {
    const C = SUIVI_COULEURS;
    const document = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
      bufferPages: true,
      info: { Title: `Suivi du contrat — ${data.client}` },
    });
    const L = 40;
    const W = document.page.width - 80;

    // --- En-tête ---
    document.image(join(ASSETS_DIR, 'logo-openinformatique.png'), L, 40, {
      height: 34,
    });
    document
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor(C.emph)
      .text("Suivi du contrat d'assistance", L, 38, {
        width: W,
        align: 'right',
      });
    document
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor(C.accent)
      .text(data.client, L, document.y + 2, { width: W, align: 'right' });
    document
      .font('Helvetica')
      .fontSize(9.5)
      .fillColor(C.muted)
      .text(`Contrat : ${data.libelleContrat}`, L, document.y + 3, {
        width: W,
        align: 'right',
      });
    let y = Math.max(document.y, 80) + 16;
    document
      .moveTo(L, y)
      .lineTo(L + W, y)
      .lineWidth(0.8)
      .strokeColor(C.border)
      .stroke();
    y += 14;

    // --- Synthèse : crédité, débité, solde ---
    const kpis = [
      {
        label: 'Temps crédité',
        value: data.credit,
        color: C.credit,
        fort: false,
      },
      { label: 'Temps débité', value: data.debit, color: C.emph, fort: false },
      {
        label: 'Solde',
        value: data.solde,
        color: data.solde < 0 ? C.danger : C.accent,
        fort: true,
      },
    ];
    const kw = (W - 2 * 10) / 3;
    const kh = 46;
    kpis.forEach((kpi, i) => {
      const x = L + i * (kw + 10);
      document
        .roundedRect(x, y, kw, kh, 6)
        .lineWidth(kpi.fort ? 1.2 : 0.8)
        .fillAndStroke(
          kpi.fort ? C.soldeBg : '#ffffff',
          kpi.fort ? C.accent : C.border,
        );
      document
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(C.muted)
        .text(kpi.label.toUpperCase(), x + 12, y + 9, {
          width: kw - 24,
          characterSpacing: 0.4,
        });
      document
        .font('Helvetica-Bold')
        .fontSize(15)
        .fillColor(kpi.color)
        .text(`${formatHeures(kpi.value)} h`, x + 12, y + 22, {
          width: kw - 24,
        });
    });
    y += kh + 18;

    // --- Tableau encadré ---
    const cols: { titre: string; w: number; align: 'left' | 'right' }[] = [
      { titre: 'Date', w: 62, align: 'left' },
      { titre: 'Demandeur', w: 100, align: 'left' },
      { titre: "Nature de l'intervention", w: W - 274, align: 'left' },
      { titre: 'Débit (h)', w: 56, align: 'right' },
      { titre: 'Crédit (h)', w: 56, align: 'right' },
    ];
    const pad = 6;
    // Bas utile : marge basse + pied de page.
    const bas = document.page.height - 40 - 22;
    let debutCadre = y;
    const fermerCadre = () =>
      document
        .rect(L, debutCadre, W, y - debutCadre)
        .lineWidth(0.8)
        .strokeColor(C.frame)
        .stroke();
    const entete = () => {
      document.rect(L, y, W, 22).fill(C.headBg);
      let x = L;
      document.font('Helvetica-Bold').fontSize(8.5).fillColor(C.text);
      for (const col of cols) {
        document.text(col.titre, x + pad, y + 7, {
          width: col.w - 2 * pad,
          align: col.align,
        });
        x += col.w;
      }
      y += 22;
    };

    entete();
    data.lignes.forEach((ligne, index) => {
      const textes = [
        ligne.date,
        ligne.demandeur,
        ligne.nature,
        ligne.debit ? formatHeures(ligne.debit) : '',
        ligne.credit ? formatHeures(ligne.credit) : '',
      ];
      const cells = cols.map((col, j) => ({ col, texte: textes[j] ?? '' }));
      document.font('Helvetica').fontSize(8.5);
      const h =
        Math.max(
          ...cells.map(({ col, texte }) =>
            document.heightOfString(texte || ' ', {
              width: col.w - 2 * pad,
            }),
          ),
        ) +
        2 * pad;
      if (y + h > bas) {
        fermerCadre();
        document.addPage();
        y = 40;
        debutCadre = y;
        entete();
      }
      if (ligne.commande) {
        document.rect(L, y, W, h).fill(C.creditBg);
      } else if (index % 2 === 1) {
        document.rect(L, y, W, h).fill(C.zebra);
      }
      let x = L;
      cells.forEach(({ col, texte }, j) => {
        const fort = ligne.commande && (j === 2 || j === 4);
        const couleur =
          ligne.commande && j === 4 ? C.credit : j <= 1 ? C.text : C.emph;
        document
          .font(fort ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(8.5)
          .fillColor(couleur)
          .text(texte, x + pad, y + pad, {
            width: col.w - 2 * pad,
            align: col.align,
          });
        x += col.w;
      });
      y += h;
      document
        .moveTo(L, y)
        .lineTo(L + W, y)
        .lineWidth(0.5)
        .strokeColor(C.border)
        .stroke();
    });
    fermerCadre();

    // --- Pied de page : date d'édition, sur chaque page ---
    const { start, count } = document.bufferedPageRange();
    for (let page = start; page < start + count; page++) {
      document.switchToPage(page);
      const marge = document.page.margins.bottom;
      // Écrire sous la marge basse sans que PDFKit ajoute une page.
      document.page.margins.bottom = 0;
      const yPied = document.page.height - 50;
      document
        .moveTo(L, yPied - 6)
        .lineTo(L + W, yPied - 6)
        .lineWidth(0.5)
        .strokeColor(C.border)
        .stroke();
      document
        .font('Helvetica')
        .fontSize(8)
        .fillColor(C.muted)
        .text(`Édité le ${data.editeLe}`, L, yPied, {
          width: W,
          align: 'right',
          lineBreak: false,
        });
      document.page.margins.bottom = marge;
    }

    return this.collect(document);
  }
}

/** Ressources des gabarits (copiées dans dist par nest-cli.json). */
const ASSETS_DIR = join(__dirname, '..', 'assets');

/** Palette du site (maquette validée), pour l'édition « Suivi du contrat ». */
const SUIVI_COULEURS = {
  text: '#212a3a',
  emph: '#060c17',
  muted: '#7987a1',
  accent: '#6571ff',
  border: '#e3e7ed',
  frame: '#cfd5df',
  headBg: '#f3f4fb',
  zebra: '#fafbfc',
  soldeBg: '#f3f4ff',
  creditBg: '#cdeed9',
  credit: '#03873c',
  danger: '#ff3366',
};

/**
 * Heures « 1,25 » (au plus deux décimales, virgule). Sans séparateur de
 * milliers : l'espace fine insécable n'existe pas dans les polices PDF standard.
 */
function formatHeures(heures: number): string {
  return (Math.round(heures * 100) / 100).toLocaleString('fr-FR', {
    maximumFractionDigits: 2,
    useGrouping: false,
  });
}
