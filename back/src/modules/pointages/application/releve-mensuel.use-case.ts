import { Inject, Injectable } from '@nestjs/common';
import { ResourceNotFoundException } from '../../../common/exceptions/app-exceptions';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user';
import { jourMetier } from '../../../common/utils/sql-date.util';
import {
  PDF_GENERATOR,
  PDF_TEMPLATE_RELEVE_MENSUEL,
} from '../../pdf/domain/pdf-generator.port';
import type {
  PdfGeneratorPort,
  ReleveMensuelPdfData,
} from '../../pdf/domain/pdf-generator.port';
import { POINTAGES } from '../domain/pointage.port';
import type { PointagePort } from '../domain/pointage.port';
import {
  bornesDuMois,
  construireReleve,
  libelleMois,
  RELEVE_SPREADSHEET,
} from '../domain/releve-mensuel';
import type { Releve, ReleveSpreadsheetPort } from '../domain/releve-mensuel';
import { assertAccess } from './pointages.use-case';

/** Fichier prêt à être renvoyé. */
export interface ReleveMensuelFichier {
  buffer: Buffer;
  filename: string;
}

/**
 * Éditions « Relevé mensuel des pointages » d'une personne : PDF détaillé
 * (une ligne par description) ou synthétique (une ligne par client et type
 * d'action), classeur Excel détaillé. Mêmes droits que le planning : ses
 * propres pointages, ou ceux de tous pour les profils Admin et Direction.
 */
@Injectable()
export class ReleveMensuelUseCase {
  constructor(
    @Inject(POINTAGES)
    private readonly pointages: PointagePort,
    @Inject(PDF_GENERATOR)
    private readonly pdfGenerator: PdfGeneratorPort,
    @Inject(RELEVE_SPREADSHEET)
    private readonly spreadsheet: ReleveSpreadsheetPort,
  ) {}

  async pdf(
    user: AuthenticatedUser,
    utilisateurId: string,
    annee: number,
    mois: number,
    synthese: boolean,
  ): Promise<ReleveMensuelFichier> {
    const { personne, releve } = await this.charger(
      user,
      utilisateurId,
      annee,
      mois,
    );
    const data: ReleveMensuelPdfData = {
      personne,
      periode: libelleMois(annee, mois),
      synthese,
      ...releve,
      editeLe: jourFr(jourMetier(new Date())),
    };
    return {
      buffer: await this.pdfGenerator.generate(
        PDF_TEMPLATE_RELEVE_MENSUEL,
        data,
      ),
      filename: nomFichier(
        annee,
        mois,
        personne,
        synthese ? '_synthese.pdf' : '.pdf',
      ),
    };
  }

  /** Classeur Excel : version détaillée uniquement. */
  async excel(
    user: AuthenticatedUser,
    utilisateurId: string,
    annee: number,
    mois: number,
  ): Promise<ReleveMensuelFichier> {
    const { personne, releve } = await this.charger(
      user,
      utilisateurId,
      annee,
      mois,
    );
    return {
      buffer: await this.spreadsheet.build(
        `Relevé mensuel — ${personne} — ${libelleMois(annee, mois)}`,
        releve,
      ),
      filename: nomFichier(annee, mois, personne, '.xlsx'),
    };
  }

  private async charger(
    user: AuthenticatedUser,
    utilisateurId: string,
    annee: number,
    mois: number,
  ): Promise<{ personne: string; releve: Releve }> {
    assertAccess(user, utilisateurId);
    const personne = await this.pointages.nomPersonne(utilisateurId);
    if (personne === null) {
      throw new ResourceNotFoundException('La personne');
    }
    const { du, au } = bornesDuMois(annee, mois);
    const [pointages, types] = await Promise.all([
      this.pointages.list(utilisateurId, du, au),
      this.pointages.typesAction(),
    ]);
    return { personne, releve: construireReleve(pointages, types, du, au) };
  }
}

/** « Releve_2026-09_JV » + suffixe. */
function nomFichier(
  annee: number,
  mois: number,
  personne: string,
  suffixe: string,
): string {
  const nom = personne.trim().replace(/\s+/g, '_');
  return `Releve_${annee}-${String(mois).padStart(2, '0')}_${nom}${suffixe}`;
}

/** « AAAA-MM-JJ » → « JJ/MM/AAAA ». */
function jourFr(jour: string): string {
  const [annee, mois, date] = jour.split('-');
  return `${date}/${mois}/${annee}`;
}
