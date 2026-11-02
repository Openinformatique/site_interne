import { Inject, Injectable } from '@nestjs/common';
import JSZip from 'jszip';
import { ValidationException } from '../../../common/exceptions/app-exceptions';
import { CLIENT_FICHE } from '../domain/client-fiche.port';
import type {
  ClientFichePort,
  ContratAssistance,
} from '../domain/client-fiche.port';
import { contratEnCours } from '../domain/contrat-suivi';
import { ContratSuiviPdfUseCase } from './contrat-suivi-pdf.use-case';

/** Critères de l'édition groupée (Pointages › Éditions › Contrats d'assistance). */
export interface ContratsAssistanceCriteres {
  /** « AAAA-MM-JJ » : contrats en cours à cette date, suivis arrêtés à cette date. */
  arreteAu: string;
  /** Clé GSOC ; null = tous les groupes. */
  groupe: string | null;
  clientId: number | null;
  contratId: number | null;
}

export interface ContratsAssistanceZip {
  buffer: Buffer;
  filename: string;
  nombre: number;
}

/**
 * Édition groupée des contrats d'assistance : un PDF « Suivi du contrat »
 * (arrêté à la date choisie) par contrat en cours à cette date et retenu par
 * les filtres, réunis dans un zip. Accessible à tous les profils.
 */
@Injectable()
export class ContratsAssistanceZipUseCase {
  constructor(
    @Inject(CLIENT_FICHE)
    private readonly fiche: ClientFichePort,
    private readonly suiviPdf: ContratSuiviPdfUseCase,
  ) {}

  /** Contrats proposés dans la fenêtre (filtres en cascade et compteur côté front). */
  list(): Promise<ContratAssistance[]> {
    return this.fiche.listContratsAssistance();
  }

  async execute(
    criteres: ContratsAssistanceCriteres,
  ): Promise<ContratsAssistanceZip> {
    const contrats = retenus(
      await this.fiche.listContratsAssistance(),
      criteres,
    );
    if (contrats.length === 0) {
      throw new ValidationException([
        {
          field: 'arreteAu',
          message: 'Aucun contrat ne correspond à ces critères.',
        },
      ]);
    }

    // Mouvements de tous les contrats en deux requêtes, puis un rendu par contrat.
    const mouvements = await this.fiche.listMouvementsParContrat(
      contrats.map((contrat) => contrat.id),
      await this.fiche.heuresParJour(),
      criteres.arreteAu,
    );
    const zip = new JSZip();
    const noms = new Set<string>();
    for (const contrat of contrats) {
      const { buffer } = await this.suiviPdf.generer(
        contrat,
        mouvements.get(contrat.id) ?? [],
        criteres.arreteAu,
      );
      zip.file(nomUnique(nomFichier(contrat), noms), buffer);
      // Rendu PDF synchrone : rendre la main entre deux contrats pour que le
      // serveur continue de répondre aux autres requêtes pendant l'édition.
      await new Promise((resolve) => setImmediate(resolve));
    }
    const [annee, mois, jour] = criteres.arreteAu.split('-');
    return {
      buffer: await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      }),
      filename: `Contrats assistance au ${jour}-${mois}-${annee}.zip`,
      nombre: contrats.length,
    };
  }
}

/** Contrats en cours à la date d'arrêté, filtrés par groupe, client, contrat. */
export function retenus(
  contrats: readonly ContratAssistance[],
  criteres: ContratsAssistanceCriteres,
): ContratAssistance[] {
  return contrats.filter(
    (contrat) =>
      contratEnCours(contrat, criteres.arreteAu) &&
      (criteres.groupe === null || contrat.groupe === criteres.groupe) &&
      (criteres.clientId === null || contrat.clientId === criteres.clientId) &&
      (criteres.contratId === null || contrat.id === criteres.contratId),
  );
}

/** « Client - Contrat.pdf », sans caractère interdit dans un nom de fichier. */
export function nomFichier(contrat: ContratAssistance): string {
  const propre = (texte: string) =>
    texte
      .replace(/[\\/:*?"<>|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const parties = [contrat.clientNom, contrat.libelleContrat ?? '']
    .map(propre)
    .filter(Boolean);
  return `${parties.join(' - ') || `Contrat ${contrat.id}`}.pdf`;
}

/** Doublon (même client, même libellé) : « … (2).pdf », « … (3).pdf ». */
export function nomUnique(nom: string, pris: Set<string>): string {
  let candidat = nom;
  for (let i = 2; pris.has(candidat.toLowerCase()); i++) {
    candidat = nom.replace(/\.pdf$/, ` (${i}).pdf`);
  }
  pris.add(candidat.toLowerCase());
  return candidat;
}
