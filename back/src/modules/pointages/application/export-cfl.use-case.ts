import { Inject, Injectable } from '@nestjs/common';
import {
  ResourceNotFoundException,
  ValidationException,
} from '../../../common/exceptions/app-exceptions';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user';
import { jourMetier } from '../../../common/utils/sql-date.util';
import {
  PDF_GENERATOR,
  PDF_TEMPLATE_EXPORT_CFL,
} from '../../pdf/domain/pdf-generator.port';
import type {
  ExportCflPdfData,
  PdfGeneratorPort,
} from '../../pdf/domain/pdf-generator.port';
import { UserRole } from '../../users/domain/user-role.enum';
import { EXPORT_CFL, jourFr, lignesExport } from '../domain/export-cfl';
import type { ExportCflCriteres, ExportCflPort } from '../domain/export-cfl';
import { POINTAGES } from '../domain/pointage.port';
import type { PointagePort } from '../domain/pointage.port';
import { assertAccess } from './pointages.use-case';

/** Période d'un an au plus (un export plus long n'aurait pas de sens). */
const JOURS_MAX = 366;
const JOUR_MS = 86_400_000;

/**
 * « Export (format CFL) » (Pointages › Éditions) : PDF des travaux réalisés
 * pour un client sur une période, du plus récent au plus ancien. Les profils
 * Admin et Direction exportent les pointages de tous ou d'une personne ; les
 * autres profils, seulement les leurs.
 */
@Injectable()
export class ExportCflUseCase {
  constructor(
    @Inject(EXPORT_CFL)
    private readonly source: ExportCflPort,
    @Inject(PDF_GENERATOR)
    private readonly pdf: PdfGeneratorPort,
    @Inject(POINTAGES)
    private readonly pointagesPort: PointagePort,
  ) {}

  async execute(
    user: AuthenticatedUser,
    demande: ExportCflCriteres,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const criteres = {
      ...demande,
      utilisateurId: this.personne(user, demande),
    };
    verifierPeriode(criteres.du, criteres.au);
    const client = await this.source.nomClient(criteres.clientId);
    if (client === null) {
      throw new ResourceNotFoundException('Le client');
    }
    const commande =
      criteres.commandeId === null
        ? null
        : await this.source.libelleCommande(
            criteres.clientId,
            criteres.commandeId,
          );
    if (criteres.commandeId !== null && commande === null) {
      throw new ResourceNotFoundException('La commande');
    }

    // Intervalle large (un jour de chaque côté) puis filtre sur le jour à Paris.
    const depuis = new Date(Date.parse(`${criteres.du}T00:00:00Z`) - JOUR_MS);
    const jusqua = new Date(
      Date.parse(`${criteres.au}T00:00:00Z`) + 2 * JOUR_MS,
    );
    const pointages = await this.source.pointages(
      criteres.clientId,
      depuis,
      jusqua,
    );
    const lignes = lignesExport(pointages, criteres);
    const libelleType =
      criteres.typeAction === null
        ? null
        : ((await this.pointagesPort.typesAction()).find(
            (type) => type.cle === criteres.typeAction,
          )?.libelle ?? criteres.typeAction);
    const personne =
      criteres.utilisateurId === null
        ? 'toutes'
        : (pointages.find(
            (p) =>
              p.utilisateurId?.toLowerCase() ===
              criteres.utilisateurId?.toLowerCase(),
          )?.salarie ?? 'choisie');
    const tags = criteres.sansTag
      ? 'sans tag uniquement'
      : criteres.tags.length > 0
        ? criteres.tags.join(', ')
        : 'tous';

    const data: ExportCflPdfData = {
      client,
      periode: `Période du ${jourFr(criteres.du)} au ${jourFr(criteres.au)}`,
      filtres: [
        `Commande : ${commande ?? 'toutes'}`,
        `Type : ${libelleType ?? 'tous'}`,
        `Personne : ${personne}`,
        `Tags : ${tags}`,
      ].join(' · '),
      lignes,
      editeLe: jourFr(jourMetier(new Date())),
    };
    return {
      buffer: await this.pdf.generate(PDF_TEMPLATE_EXPORT_CFL, data),
      filename: `Travaux réalisés ${client} ${jourFr(criteres.du).replace(/\//g, '-')} au ${jourFr(criteres.au).replace(/\//g, '-')}.pdf`,
    };
  }

  /** Admin / Direction : tous ou une personne ; autres profils : eux-mêmes. */
  private personne(
    user: AuthenticatedUser,
    demande: ExportCflCriteres,
  ): string | null {
    if (demande.utilisateurId !== null) {
      assertAccess(user, demande.utilisateurId);
      return demande.utilisateurId;
    }
    return user.role === UserRole.Admin || user.role === UserRole.Direction
      ? null
      : user.userId;
  }
}

/** Fin après début, un an au plus. */
function verifierPeriode(du: string, au: string): void {
  const jours = (Date.parse(au) - Date.parse(du)) / JOUR_MS;
  if (jours < 0) {
    throw new ValidationException([
      { field: 'au', message: 'La date de fin doit suivre la date de début.' },
    ]);
  }
  if (jours >= JOURS_MAX) {
    throw new ValidationException([
      { field: 'au', message: 'La période est limitée à un an.' },
    ]);
  }
}
