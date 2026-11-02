import { Inject, Injectable } from '@nestjs/common';
import { ResourceNotFoundException } from '../../../common/exceptions/app-exceptions';
import { jourMetier } from '../../../common/utils/sql-date.util';
import {
  PDF_GENERATOR,
  PDF_TEMPLATE_SUIVI_CONTRAT,
} from '../../pdf/domain/pdf-generator.port';
import type {
  PdfGeneratorPort,
  SuiviContratPdfData,
} from '../../pdf/domain/pdf-generator.port';
import { CLIENT_FICHE } from '../domain/client-fiche.port';
import type { ClientFichePort } from '../domain/client-fiche.port';

/** PDF prêt à être renvoyé. */
export interface SuiviContratPdf {
  buffer: Buffer;
  filename: string;
}

/**
 * Édition PDF « Suivi du contrat d'assistance » : mêmes mouvements et mêmes
 * totaux que la fenêtre du contrat (pointages à partir de la première
 * commande, voir domain/contrat-suivi.ts), de la plus récente à la plus
 * ancienne. Un contrat sans commande donne une édition vide (crédit 0 h).
 */
@Injectable()
export class ContratSuiviPdfUseCase {
  constructor(
    @Inject(CLIENT_FICHE)
    private readonly fiche: ClientFichePort,
    @Inject(PDF_GENERATOR)
    private readonly pdf: PdfGeneratorPort,
  ) {}

  async execute(clientId: number, contratId: number): Promise<SuiviContratPdf> {
    const client = await this.fiche.findClient(clientId);
    if (!client) {
      throw new ResourceNotFoundException('Le client');
    }
    if (!(await this.fiche.contratBelongsTo(clientId, contratId))) {
      throw new ResourceNotFoundException('Le contrat');
    }
    const heuresParJour = await this.fiche.heuresParJour();
    const [contrats, mouvements] = await Promise.all([
      this.fiche.listContrats(clientId, heuresParJour),
      this.fiche.listMouvements(contratId, heuresParJour),
    ]);
    const contrat = contrats.find((candidate) => candidate.id === contratId)!;
    const nomClient = client.raisonSociale?.trim() || client.codeClient || '';

    const data: SuiviContratPdfData = {
      client: nomClient,
      libelleContrat: contrat.libelleContrat ?? '',
      credit: contrat.credit,
      debit: contrat.debit,
      solde: contrat.restant,
      lignes: mouvements.map((mouvement) => ({
        date: jourFr(mouvement.date),
        demandeur: mouvement.demandeur ?? '',
        nature: mouvement.nature,
        debit: mouvement.debit,
        credit: mouvement.credit,
        commande: mouvement.type === 'COMMANDE',
      })),
      editeLe: jourFr(jourMetier(new Date())),
    };
    return {
      buffer: await this.pdf.generate(PDF_TEMPLATE_SUIVI_CONTRAT, data),
      filename: `Suivi contrat ${nomClient}.pdf`,
    };
  }
}

/** « AAAA-MM-JJ » → « JJ/MM/AAAA ». */
function jourFr(jour: string | null): string {
  if (!jour) {
    return '';
  }
  const [annee, mois, date] = jour.slice(0, 10).split('-');
  return `${date}/${mois}/${annee}`;
}
