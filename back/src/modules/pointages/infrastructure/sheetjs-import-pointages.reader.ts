import { Injectable } from '@nestjs/common';
import { read, utils } from 'xlsx';
import {
  COLONNES_IMPORT,
  LIGNES_MAX,
  type Cellule,
} from '../domain/import-pointages';
import type {
  ClasseurImport,
  ClasseurImportPort,
} from '../application/import-pointages.use-case';

/** Colonnes lues au-delà de H pour détecter une colonne en trop. */
const COLONNES_LUES = COLONNES_IMPORT.length + 4;

/**
 * Lecture du classeur d'import (première feuille) avec SheetJS : formats
 * .xlsx et .xls (Excel 97-2003). Les dates sont lues en numéro de série
 * Excel (sans fuseau), converties par le domaine (lireJour).
 */
@Injectable()
export class SheetJsImportPointagesReader implements ClasseurImportPort {
  lire(contenu: Buffer): Promise<ClasseurImport | null> {
    return Promise.resolve(lireClasseur(contenu));
  }
}

/** Signatures acceptées : .xlsx (archive ZIP) et .xls (document OLE2). */
const SIGNATURES = [
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
];

function lireClasseur(contenu: Buffer): ClasseurImport | null {
  // SheetJS lit aussi CSV, HTML… : seuls les vrais classeurs Excel sont admis.
  if (
    !SIGNATURES.some((signature) =>
      contenu.subarray(0, signature.length).equals(signature),
    )
  ) {
    return null;
  }
  let classeur;
  try {
    classeur = read(contenu, { type: 'buffer', cellDates: false });
  } catch {
    return null;
  }
  const nom = classeur.SheetNames[0];
  const feuille = nom ? classeur.Sheets[nom] : undefined;
  if (!feuille) {
    return null;
  }
  // Lecture depuis A1, quelle que soit la plage déclarée par la feuille.
  const plage = utils.decode_range(feuille['!ref'] ?? 'A1');
  const lignes = utils.sheet_to_json<unknown[]>(feuille, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true,
    range: { s: { r: 0, c: 0 }, e: plage.e },
  });
  const cellules = (ligne: unknown[] | undefined, nombre: number): Cellule[] =>
    Array.from({ length: nombre }, (_, index) => valeur(ligne?.[index]));

  return {
    entetes: cellules(lignes[0], COLONNES_LUES),
    lignes: lignes.slice(1, LIGNES_MAX + 1).map((ligne, index) => ({
      numero: index + 2,
      cellules: cellules(ligne, COLONNES_IMPORT.length),
    })),
    tropDeLignes: lignes.length > LIGNES_MAX + 1,
  };
}

function valeur(value: unknown): Cellule {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number' || typeof value === 'string') {
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? 'VRAI' : 'FAUX';
  }
  return null;
}
