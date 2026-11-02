import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import type { ExportCflPdfData } from '../domain/pdf-generator.port';

const MARGE = 40;
/** Ressources des gabarits (copiées dans dist par nest-cli.json). */
const ASSETS_DIR = join(__dirname, '..', 'assets');

/** Palette du site, comme l'édition « Suivi du contrat ». */
const C = {
  text: '#212a3a',
  emph: '#060c17',
  muted: '#7987a1',
  accent: '#6571ff',
  border: '#e3e7ed',
  frame: '#cfd5df',
  headBg: '#f3f4fb',
  zebra: '#fafbfc',
  fortBg: '#f3f4ff',
};

/**
 * « Export (format CFL) » — travaux réalisés pour un client (maquette
 * validée le 02/11/2026), au style du « Suivi du contrat » : en-tête logo,
 * titre, client, période et filtres ; synthèse pointages / temps total /
 * minutes ; tableau encadré Demandeur, Date, Libellé, Tps (mn), Pers. (en-tête
 * répété à chaque page) terminé par une ligne de total ; pied « Page x / n »
 * et « Édité le … ».
 *
 * Renvoie le document à terminer (collecte par le générateur).
 */
export function renderExportCfl(data: ExportCflPdfData): PDFKit.PDFDocument {
  const document = new PDFDocument({
    size: 'A4',
    margins: { top: MARGE, bottom: MARGE, left: MARGE, right: MARGE },
    bufferPages: true,
    info: { Title: `Travaux réalisés pour ${data.client}` },
  });
  const L = MARGE;
  const W = document.page.width - 2 * MARGE;
  const total = data.lignes.reduce((s, ligne) => s + ligne.minutes, 0);

  // --- En-tête ---
  document.image(join(ASSETS_DIR, 'logo-openinformatique.png'), L, MARGE, {
    height: 34,
  });
  document
    .font('Helvetica-Bold')
    .fontSize(16)
    .fillColor(C.emph)
    .text('Travaux réalisés', L, 38, { width: W, align: 'right' });
  document
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor(C.accent)
    .text(data.client, L, document.y + 2, { width: W, align: 'right' });
  document
    .font('Helvetica')
    .fontSize(9.5)
    .fillColor(C.muted)
    .text(data.periode, L, document.y + 3, { width: W, align: 'right' });
  document
    .fontSize(9)
    .text(data.filtres, L, document.y + 2, { width: W, align: 'right' });
  let y = Math.max(document.y, 80) + 14;
  document
    .moveTo(L, y)
    .lineTo(L + W, y)
    .lineWidth(0.8)
    .strokeColor(C.border)
    .stroke();
  y += 14;

  // --- Synthèse ---
  const kpis = [
    { label: 'Pointages', value: entier(data.lignes.length), fort: false },
    { label: 'Temps total', value: heuresMinutes(total), fort: true },
    { label: 'Soit en minutes', value: `${entier(total)} mn`, fort: false },
  ];
  const kw = (W - 20) / 3;
  const kh = 46;
  kpis.forEach((kpi, i) => {
    const x = L + i * (kw + 10);
    document
      .roundedRect(x, y, kw, kh, 6)
      .lineWidth(kpi.fort ? 1.2 : 0.8)
      .fillAndStroke(
        kpi.fort ? C.fortBg : '#ffffff',
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
      .fillColor(kpi.fort ? C.accent : C.emph)
      .text(kpi.value, x + 12, y + 22, { width: kw - 24 });
  });
  y += kh + 18;

  // --- Tableau encadré ---
  const cols: { titre: string; w: number; align: 'left' | 'right' }[] = [
    { titre: 'Demandeur', w: 96, align: 'left' },
    { titre: 'Date', w: 60, align: 'left' },
    { titre: 'Libellé', w: W - 252, align: 'left' },
    { titre: 'Tps (mn)', w: 52, align: 'right' },
    { titre: 'Pers.', w: 44, align: 'left' },
  ];
  const pad = 6;
  // Bas utile : marge basse + pied de page.
  const bas = document.page.height - MARGE - 22;
  let debutCadre = y;
  const fermerCadre = () =>
    document
      .rect(L, debutCadre, W, y - debutCadre)
      .lineWidth(0.8)
      .strokeColor(C.frame)
      .stroke();
  const nouvellePage = () => {
    fermerCadre();
    document.addPage();
    y = MARGE;
    debutCadre = y;
  };
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
      ligne.demandeur,
      ligne.date,
      ligne.libelle,
      entier(ligne.minutes),
      ligne.salarie,
    ];
    const cells = cols.map((col, j) => ({ col, texte: textes[j] ?? '' }));
    document.font('Helvetica').fontSize(8.5);
    // Seuls Demandeur et Libellé passent à la ligne.
    const h =
      Math.max(
        ...cells
          .filter((_, j) => j === 0 || j === 2)
          .map(({ col, texte }) =>
            document.heightOfString(texte || ' ', { width: col.w - 2 * pad }),
          ),
      ) +
      2 * pad;
    if (y + h > bas) {
      nouvellePage();
      entete();
    }
    if (index % 2 === 1) {
      document.rect(L, y, W, h).fill(C.zebra);
    }
    let x = L;
    cells.forEach(({ col, texte }, j) => {
      x += col.w;
      if (!texte) {
        return;
      }
      document
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(j === 2 ? C.emph : C.text)
        .text(texte, x - col.w + pad, y + pad, {
          width: col.w - 2 * pad,
          align: col.align,
          lineBreak: j === 0 || j === 2,
        });
    });
    y += h;
    document
      .moveTo(L, y)
      .lineTo(L + W, y)
      .lineWidth(0.5)
      .strokeColor(C.border)
      .stroke();
  });

  // --- Ligne de total ---
  if (y + 24 > bas) {
    nouvellePage();
  }
  document.rect(L, y, W, 24).fill(C.headBg);
  document
    .font('Helvetica-Bold')
    .fontSize(8.5)
    .fillColor(C.emph)
    .text('Total', L + pad, y + 8, {
      width: W - 96 - 2 * pad,
      align: 'right',
      lineBreak: false,
    })
    .text(entier(total), L + W - 96 + pad, y + 8, {
      width: 52 - 2 * pad,
      align: 'right',
      lineBreak: false,
    });
  y += 24;
  fermerCadre();

  // --- Pied de page : pagination et date d'édition, sur chaque page ---
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
      .text(`Page ${page - start + 1} / ${count}`, L, yPied, {
        width: W / 2,
        lineBreak: false,
      })
      .text(`Édité le ${data.editeLe}`, L + W / 2, yPied, {
        width: W / 2,
        align: 'right',
        lineBreak: false,
      });
    document.page.margins.bottom = marge;
  }
  return document;
}

/** Entier sans séparateur de milliers (absent des polices PDF standard). */
function entier(n: number): string {
  return String(Math.round(n));
}

/** « 363 h 04 ». */
function heuresMinutes(minutes: number): string {
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
}
