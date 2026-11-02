import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import type {
  ReleveFacturable,
  ReleveMensuelPdfData,
} from '../domain/pdf-generator.port';

/**
 * « Relevé mensuel des pointages » (maquette validée le 02/11/2026), au style
 * de l'édition « Suivi du contrat » : en-tête logo + titre, synthèse en
 * quatre vignettes, tableau encadré dont l'en-tête est répété à chaque page,
 * pied « Édité le … · page x / n ».
 *
 * - Détaillé : Client / Type / N° cde / Description / Temps / Facturable,
 *   groupes affichés sur leur première ligne (rappel « (suite) » en haut de
 *   page), totaux par commande et type (teinte de la couleur TYPA), par
 *   client et général.
 * - Synthétique : Client / Type d'action / Commandes / Temps, sans totaux.
 *
 * Renvoie le document à terminer (collecte par le générateur).
 */
export function renderReleveMensuel(
  data: ReleveMensuelPdfData,
): PDFKit.PDFDocument {
  const document = new PDFDocument({
    size: 'A4',
    margins: { top: MARGE, bottom: MARGE, left: MARGE, right: MARGE },
    bufferPages: true,
    info: {
      Title: `Relevé mensuel — ${data.personne} — ${data.periode}`,
    },
  });
  const W = document.page.width - 2 * MARGE;
  const periode = data.synthese ? `${data.periode} · synthèse` : data.periode;

  // --- En-tête ---
  document.image(join(ASSETS_DIR, 'logo-openinformatique.png'), L, MARGE, {
    height: 34,
  });
  document
    .font('Helvetica-Bold')
    .fontSize(16)
    .fillColor(C.emph)
    .text('Relevé mensuel des pointages', L, 38, { width: W, align: 'right' });
  document
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor(C.accent)
    .text(data.personne, L, document.y + 2, { width: W, align: 'right' });
  document
    .font('Helvetica')
    .fontSize(9.5)
    .fillColor(C.muted)
    .text(periode, L, document.y + 3, { width: W, align: 'right' });
  let y = Math.max(document.y, 80) + 14;
  document
    .moveTo(L, y)
    .lineTo(L + W, y)
    .lineWidth(0.8)
    .strokeColor(C.border)
    .stroke();
  y += 14;

  // --- Synthèse : quatre vignettes ---
  const kpis = [
    { label: 'Temps de travail', value: data.total, fort: true },
    { label: 'Clients', value: data.clients, fort: false },
    { label: 'Interne', value: data.interne, fort: false },
    { label: 'Absences', value: data.absences, fort: false },
  ];
  const kw = (W - 3 * 8) / 4;
  const kh = 46;
  kpis.forEach((kpi, i) => {
    const x = L + i * (kw + 8);
    document
      .roundedRect(x, y, kw, kh, 6)
      .lineWidth(kpi.fort ? 1.2 : 0.8)
      .fillAndStroke(
        kpi.fort ? C.forteBg : '#ffffff',
        kpi.fort ? C.accent : C.border,
      );
    document
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(C.muted)
      .text(kpi.label.toUpperCase(), x + 10, y + 9, {
        width: kw - 20,
        characterSpacing: 0.4,
      });
    document
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor(kpi.fort ? C.accent : C.emph)
      .text(`${formatHeures(kpi.value)} h`, x + 10, y + 22, {
        width: kw - 20,
      });
  });
  y += kh + 16;

  // --- Tableau encadré ---
  const cols: Colonne[] = data.synthese
    ? [
        { titre: 'Client', w: 130, align: 'left' },
        { titre: "Type d'action", w: 160, align: 'left' },
        { titre: 'Commandes', w: W - 356, align: 'left' },
        { titre: 'Temps', w: 66, align: 'right' },
      ]
    : [
        // Largeurs minimales pour « Développement », « ASSISTANCE », « 176,00 h ».
        { titre: 'Client', w: 72, align: 'left' },
        { titre: 'Type', w: 68, align: 'left' },
        { titre: 'N° cde', w: 60, align: 'left' },
        { titre: 'Description', w: W - 300, align: 'left' },
        { titre: 'Temps', w: 50, align: 'right' },
        { titre: 'Facturable', w: 50, align: 'right' },
      ];
  const xs = cols.map((_, i) =>
    cols.slice(0, i).reduce((x, col) => x + col.w, L),
  );
  /** Abscisse et largeur de la colonne i. */
  const X = (i: number) => xs[i] ?? L;
  const Wc = (i: number) => cols[i]?.w ?? 0;
  // Bas utile : marge basse + pied de page.
  const bas = document.page.height - MARGE - 22;
  let debutCadre = y;
  const fermerCadre = () =>
    document
      .rect(L, debutCadre, W, y - debutCadre)
      .lineWidth(0.8)
      .strokeColor(C.frame)
      .stroke();
  const entete = () => {
    document.rect(L, y, W, 20).fill(C.headBg);
    document.font('Helvetica-Bold').fontSize(8).fillColor(C.text);
    cols.forEach((col, i) =>
      document.text(col.titre, X(i) + PAD, y + 6.5, {
        width: col.w - 2 * PAD,
        align: col.align,
      }),
    );
    y += 20;
  };
  /** Place une rangée de hauteur h ; true si elle ouvre une nouvelle page. */
  const placer = (h: number): boolean => {
    if (y + h <= bas) {
      return false;
    }
    fermerCadre();
    document.addPage();
    y = MARGE;
    debutCadre = y;
    entete();
    return true;
  };
  const filet = (depuis: number, epaisseur = 0.5, couleur = C.border) =>
    document
      .moveTo(depuis, y)
      .lineTo(L + W, y)
      .lineWidth(epaisseur)
      .strokeColor(couleur)
      .stroke();
  const hauteur = (
    texte: string,
    largeur: number,
    police: string,
    taille = 8,
  ) =>
    document
      .font(police)
      .fontSize(taille)
      .heightOfString(texte || ' ', { width: largeur - 2 * PAD });

  entete();

  /** Cellule du client : nom en gras, « (suite) » en haut d'une nouvelle page. */
  const celluleClient = (
    client: string,
    suite: boolean,
    x: number,
    w: number,
  ) => {
    document
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(C.text)
      .text(suite ? `${client} ` : client, x + PAD, y + PAD_V, {
        width: w - 2 * PAD,
        continued: suite,
      });
    if (suite) {
      document.font('Helvetica-Oblique').fillColor(C.muted).text('(suite)');
    }
  };

  if (data.groupes.length === 0) {
    const message = 'Aucun pointage sur ce mois.';
    const h = hauteur(message, W, 'Helvetica-Oblique') + 2 * PAD_V + 4;
    document
      .font('Helvetica-Oblique')
      .fontSize(8)
      .fillColor(C.muted)
      .text(message, L + PAD, y + PAD_V + 2, { width: W - 2 * PAD });
    y += h;
    filet(L);
  }

  if (data.synthese) {
    // --- Synthèse : une ligne par client et type d'action ---
    let premiereRangee = true;
    for (const groupe of data.groupes) {
      groupe.types.forEach((type, index) => {
        const commandes = type.commandes
          .map((commande) => commande.numero)
          .filter(Boolean)
          .join(', ');
        const textes = (suite: boolean) => [
          index === 0 || suite
            ? `${groupe.client}${suite && index > 0 ? ' (suite)' : ''}`
            : '',
          type.libelle,
          commandes,
          `${formatHeures(type.heures)} h`,
        ];
        const mesure = (suite: boolean) =>
          Math.max(
            ...textes(suite).map((texte, j) =>
              hauteur(
                texte,
                Wc(j) - (j === 1 ? 13 : 0),
                j === 0 ? 'Helvetica-Bold' : 'Helvetica',
              ),
            ),
          ) +
          2 * PAD_V;
        let suite = placer(mesure(false)) && index > 0;
        const h = mesure(suite);
        if (suite && placer(h)) {
          suite = index > 0;
        }
        // Filet plus marqué entre deux clients, à défaut de ligne de total.
        if (index === 0 && !premiereRangee && y > debutCadre + 20) {
          filet(L, 0.8, C.frame);
        }
        premiereRangee = false;
        if (index === 0 || suite) {
          celluleClient(groupe.client, suite && index > 0, X(0), Wc(0));
        }
        document
          .roundedRect(X(1) + PAD, y + PAD_V + 0.5, 8, 8, 2)
          .fill(rgb(type.couleur));
        document
          .font('Helvetica')
          .fontSize(8)
          .fillColor(C.emph)
          .text(type.libelle, X(1) + PAD + 13, y + PAD_V, {
            width: Wc(1) - 2 * PAD - 13,
          })
          .text(commandes, X(2) + PAD, y + PAD_V, {
            width: Wc(2) - 2 * PAD,
          })
          .text(`${formatHeures(type.heures)} h`, X(3) + PAD, y + PAD_V, {
            width: Wc(3) - 2 * PAD,
            align: 'right',
          });
        y += h;
        filet(L);
      });
    }
  } else {
    // --- Détaillé ---
    /** Rangée de total : libellé de la colonne `debut` à la Description. */
    const total = (
      debut: number,
      libelle: string,
      heures: number,
      fond: string,
      general = false,
    ) => {
      const taille = general ? 9 : 8;
      const padV = general ? 6 : PAD_V;
      const largeur = X(4) - X(debut);
      const h = hauteur(libelle, largeur, 'Helvetica-Bold', taille) + 2 * padV;
      placer(h);
      document.rect(X(debut), y, L + W - X(debut), h).fill(fond);
      document
        .font('Helvetica-Bold')
        .fontSize(taille)
        .fillColor(general ? '#ffffff' : C.emph)
        .text(libelle, X(debut) + PAD, y + padV, {
          width: largeur - 2 * PAD,
        })
        .text(`${formatHeures(heures)} h`, X(4) + PAD, y + padV, {
          width: Wc(4) - 2 * PAD,
          align: 'right',
        });
      y += h;
      filet(L);
    };

    for (const groupe of data.groupes) {
      let premierDuClient = true;
      for (const type of groupe.types) {
        let premierDuType = true;
        for (const commande of type.commandes) {
          commande.lignes.forEach((ligne, index) => {
            const montre = [premierDuClient, premierDuType, index === 0];
            const groupes = [
              groupe.client,
              type.libelle,
              commande.numero ?? '',
            ];
            const textes = (suite: boolean) => [
              ...groupes.map((texte, j) =>
                montre[j] || suite
                  ? j === 0 && suite && !montre[0]
                    ? `${texte} (suite)`
                    : texte
                  : '',
              ),
              ligne.description,
              `${formatHeures(ligne.heures)} h`,
              LIBELLES_FACTURABLE[ligne.facturable],
            ];
            const mesure = (suite: boolean) =>
              Math.max(
                ...textes(suite).map((texte, j) =>
                  hauteur(
                    texte,
                    Wc(j),
                    j === 0 ? 'Helvetica-Bold' : 'Helvetica',
                  ),
                ),
              ) +
              2 * PAD_V;
            const suite = placer(mesure(false));
            const h = mesure(suite);
            if (suite) {
              placer(h);
            }
            const cellules = textes(suite);
            if (cellules[0] ?? '') {
              celluleClient(groupe.client, suite && !montre[0], X(0), Wc(0));
            }
            document.font('Helvetica').fontSize(8).fillColor(C.text);
            for (const j of [1, 2]) {
              document.text(cellules[j] ?? '', X(j) + PAD, y + PAD_V, {
                width: Wc(j) - 2 * PAD,
              });
            }
            document
              .fillColor(C.emph)
              .text(ligne.description, X(3) + PAD, y + PAD_V, {
                width: Wc(3) - 2 * PAD,
              })
              .text(cellules[4] ?? '', X(4) + PAD, y + PAD_V, {
                width: Wc(4) - 2 * PAD,
                align: 'right',
              });
            const statut = STYLE_FACTURABLE[ligne.facturable];
            document
              .font(statut.police)
              .fontSize(7.5)
              .fillColor(statut.couleur)
              .text(cellules[5] ?? '', X(5) + PAD, y + PAD_V + 0.5, {
                width: Wc(5) - 2 * PAD,
                align: 'right',
              });
            y += h;
            // Pas de filet sous les colonnes de regroupement.
            filet(X(3));
            premierDuClient = false;
            premierDuType = false;
          });
          if (commande.numero) {
            total(
              2,
              `Total ${commande.numero}`,
              commande.heures,
              teinte(type.couleur, 0.3),
            );
          }
        }
        total(
          1,
          `Total ${type.libelle}`,
          type.heures,
          teinte(type.couleur, 0.6),
        );
      }
      total(0, `Total ${groupe.client}`, groupe.heures, C.clientBg);
    }
    total(0, 'Total temps de travail', data.total, C.emph, true);
  }
  fermerCadre();

  // --- Pied de page sur chaque page ---
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
      .text(`${data.personne} · ${periode}`, L, yPied, {
        width: W / 2,
        lineBreak: false,
      })
      .text(
        `Édité le ${data.editeLe} · page ${page - start + 1} / ${count}`,
        L + W / 2,
        yPied,
        { width: W / 2, align: 'right', lineBreak: false },
      );
    document.page.margins.bottom = marge;
  }

  return document;
}

interface Colonne {
  titre: string;
  w: number;
  align: 'left' | 'right';
}

const MARGE = 40;
const L = MARGE;
/** Marges intérieures des cellules (horizontale, verticale). */
const PAD = 4;
const PAD_V = 4;

/** Ressources des gabarits (copiées dans dist par nest-cli.json). */
const ASSETS_DIR = join(__dirname, '..', 'assets');

/** Palette du site (maquette validée), comme le « Suivi du contrat ». */
const C = {
  text: '#212a3a',
  emph: '#060c17',
  muted: '#7987a1',
  accent: '#6571ff',
  border: '#e3e7ed',
  frame: '#cfd5df',
  headBg: '#f3f4fb',
  clientBg: '#eef0f5',
  forteBg: '#f3f4ff',
};

const LIBELLES_FACTURABLE: Record<ReleveFacturable, string> = {
  oui: 'Oui',
  non: 'Non',
  attente: 'En attente',
};

const STYLE_FACTURABLE: Record<
  ReleveFacturable,
  { police: string; couleur: string }
> = {
  oui: { police: 'Helvetica-Bold', couleur: '#03873c' },
  non: { police: 'Helvetica', couleur: '#a3adbf' },
  attente: { police: 'Helvetica-Bold', couleur: '#c27c00' },
};

/** Couleur TYPA « R,V,B » (gris si absente ou illisible). */
function composantes(couleur: string | null): [number, number, number] {
  const [r, v, b, ...reste] = (couleur ?? '')
    .split(',')
    .map((part) => Number(part.trim()));
  const valide = (n: number | undefined): n is number =>
    n !== undefined && Number.isInteger(n) && n >= 0 && n <= 255;
  return valide(r) && valide(v) && valide(b) && reste.length === 0
    ? [r, v, b]
    : [200, 200, 200];
}

function rgb(couleur: string | null): string {
  return hex(composantes(couleur));
}

/** Couleur mêlée de blanc : `force` 1 = couleur pure, 0 = blanc. */
function teinte(couleur: string | null, force: number): string {
  return hex(
    composantes(couleur).map((v) => Math.round(255 - (255 - v) * force)) as [
      number,
      number,
      number,
    ],
  );
}

function hex(valeurs: [number, number, number]): string {
  return `#${valeurs.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Heures « 1,25 » (deux décimales, virgule). Sans séparateur de milliers :
 * l'espace fine insécable n'existe pas dans les polices PDF standard.
 */
function formatHeures(heures: number): string {
  return (Math.round(heures * 100) / 100).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  });
}
