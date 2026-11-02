import { Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user';
import {
  controlerEntetes,
  heureMinute,
  horaires,
  instantParis,
  joinTags,
  libelleColonne,
  ligneVide,
  lireLigne,
  normaliser,
  type Cellule,
  type ControleFormat,
  type ErreurImport,
  type LettreColonne,
  type LigneBrute,
  type LigneLue,
} from '../domain/import-pointages';
import {
  FACTURABLE,
  POINTAGES,
  type CommandeOption,
  type ContactOption,
  type PointageInput,
  type PointagePort,
} from '../domain/pointage.port';
import { assertAccess, PointagesUseCase } from './pointages.use-case';

/** Contenu lu du classeur : en-têtes (ligne 1) et lignes suivantes. */
export interface ClasseurImport {
  entetes: Cellule[];
  lignes: LigneBrute[];
  tropDeLignes: boolean;
}

export interface ClasseurImportPort {
  /** null si le fichier n'est pas un classeur Excel lisible. */
  lire(contenu: Buffer): Promise<ClasseurImport | null>;
}

export const CLASSEUR_IMPORT = Symbol('CLASSEUR_IMPORT');

/** Pointage prêt à être créé, tel qu'affiché dans l'aperçu. */
export interface PointageImporte {
  ligne: number;
  jour: string;
  /** « 07:00 », « 07:30 ». */
  debut: string;
  fin: string;
  client: string | null;
  type: string;
  commande: string | null;
  contact: string | null;
  tags: { libelle: string; parametre: boolean }[];
  description: string;
  heures: number;
}

export interface ResultatImport {
  /** null si le fichier n'est pas lisible (pas un classeur Excel). */
  format: ControleFormat | null;
  erreurs: ErreurImport[];
  pointages: PointageImporte[];
  /** Pointages créés (0 pour une vérification ou un fichier en erreur). */
  importes: number;
}

/** Champ d'une règle de saisie → colonne du fichier. */
const COLONNE_DU_CHAMP: Record<string, LettreColonne> = {
  clientId: 'A',
  typeAction: 'B',
  commandeId: 'D',
  debut: 'E',
  fin: 'F',
  contactId: 'H',
};

interface LigneResolue {
  lue: LigneLue;
  input: PointageInput | null;
  apercu: PointageImporte | null;
}

/**
 * Import de pointages depuis un classeur Excel, pour la personne affichée
 * dans l'écran Pointages. Vérification complète avant toute création : au
 * moindre défaut (format, référence, règle de saisie), rien n'est importé.
 */
@Injectable()
export class ImportPointagesUseCase {
  constructor(
    @Inject(POINTAGES) private readonly pointages: PointagePort,
    @Inject(CLASSEUR_IMPORT) private readonly classeur: ClasseurImportPort,
    private readonly saisie: PointagesUseCase,
  ) {}

  /** Contrôle et aperçu, sans rien créer. */
  async verifier(
    user: AuthenticatedUser,
    utilisateurId: string,
    contenu: Buffer,
  ): Promise<ResultatImport> {
    assertAccess(user, utilisateurId);
    const { resultat } = await this.analyser(utilisateurId, contenu);
    return resultat;
  }

  /** Nouveau contrôle complet, puis création de tous les pointages (tout ou rien). */
  async importer(
    user: AuthenticatedUser,
    utilisateurId: string,
    contenu: Buffer,
  ): Promise<ResultatImport> {
    assertAccess(user, utilisateurId);
    const { resultat, inputs } = await this.analyser(utilisateurId, contenu);
    if (!valide(resultat)) {
      return resultat;
    }
    const importes = await this.pointages.createMany(inputs, user.userId);
    return { ...resultat, importes };
  }

  private async analyser(
    utilisateurId: string,
    contenu: Buffer,
  ): Promise<{ resultat: ResultatImport; inputs: PointageInput[] }> {
    const vide = { erreurs: [], pointages: [], importes: 0 };
    const classeur = await this.classeur.lire(contenu);
    if (!classeur) {
      return {
        resultat: {
          ...vide,
          format: null,
          erreurs: [
            erreurFichier(
              "Le fichier n'est pas un classeur Excel (.xlsx ou .xls) lisible.",
            ),
          ],
        },
        inputs: [],
      };
    }
    const format = controlerEntetes(classeur.entetes);
    if (!format.conforme) {
      return { resultat: { ...vide, format }, inputs: [] };
    }

    const erreurs: ErreurImport[] = [];
    if (classeur.tropDeLignes) {
      erreurs.push(
        erreurFichier('Le fichier dépasse 2 000 lignes de pointage.'),
      );
    }
    const lues = classeur.lignes
      .filter((ligne) => !ligneVide(ligne))
      .map((ligne) => {
        const lecture = lireLigne(ligne);
        erreurs.push(...lecture.erreurs);
        return lecture.ligne;
      });
    if (lues.length === 0) {
      erreurs.push(
        erreurFichier('Aucun pointage à importer à partir de la ligne 2.'),
      );
    }

    const resolues = await this.resoudre(utilisateurId, lues, erreurs);
    erreurs.sort(
      (a, b) =>
        (a.ligne ?? 0) - (b.ligne ?? 0) ||
        (a.colonne ?? '').localeCompare(b.colonne ?? ''),
    );
    return {
      resultat: {
        format,
        erreurs,
        pointages: resolues.flatMap((r) => (r.apercu ? [r.apercu] : [])),
        importes: 0,
      },
      inputs: resolues.flatMap((r) => (r.input ? [r.input] : [])),
    };
  }

  /** Références (client, type, commande, contact, tags), horaires et règles de saisie. */
  private async resoudre(
    utilisateurId: string,
    lues: LigneLue[],
    erreurs: ErreurImport[],
  ): Promise<LigneResolue[]> {
    const [types, tagsParametres, clients] = await Promise.all([
      this.pointages.typesAction(),
      this.pointages.tags(),
      this.pointages.clients(),
    ]);
    const typesConnus = new Set(types.map((type) => type.cle.toUpperCase()));
    const tagParNom = new Map(
      tagsParametres.map((tag) => [normaliser(tag), tag]),
    );
    const clientParCode = new Map(
      clients.map((client) => [normaliser(client.code), client]),
    );
    const commandesDe = memo((clientId: number) =>
      this.pointages.commandes(clientId),
    );
    const contactsDe = memo((clientId: number) =>
      this.pointages.contacts(clientId),
    );
    const plages = horaires(lues);

    const resolues: LigneResolue[] = [];
    for (const [index, lue] of lues.entries()) {
      const avant = erreurs.length;
      const erreur = (
        lettre: LettreColonne,
        valeur: string | null,
        message: string,
      ) =>
        erreurs.push({
          ligne: lue.numero,
          colonne: libelleColonne(lettre),
          valeur,
          message,
        });

      const client = lue.client
        ? clientParCode.get(normaliser(lue.client))
        : null;
      if (lue.client && !client) {
        erreur(
          'A',
          lue.client,
          'Client inconnu ou inactif (code client attendu).',
        );
      }
      if (lue.type && !typesConnus.has(lue.type)) {
        erreur('B', lue.type, 'Type de pointage inconnu.');
      }
      let commande: CommandeOption | null = null;
      if (lue.commande && client) {
        const trouvee = choisirCommande(
          await commandesDe(client.id),
          lue.commande,
        );
        if (typeof trouvee === 'string') {
          erreur(
            'D',
            lue.commande,
            trouvee.replace('{client}', client.code ?? ''),
          );
        } else {
          commande = trouvee;
        }
      } else if (lue.commande && !lue.client) {
        erreur(
          'D',
          lue.commande,
          'Une commande demande un client (colonne A).',
        );
      }
      let contact: ContactOption | null = null;
      if (lue.contact && client) {
        contact = choisirContact(await contactsDe(client.id), lue.contact);
        if (!contact) {
          erreur(
            'H',
            lue.contact,
            `Contact introuvable pour le client ${client.code ?? ''}.`,
          );
        }
      } else if (lue.contact && !lue.client) {
        erreur('H', lue.contact, 'Un contact demande un client (colonne A).');
      }
      const plage = plages[index];
      if (plage && plage.fin > 24 * 60) {
        erreur(
          'F',
          String(lue.heures),
          `Les pointages du ${jourFr(lue.jour!)} dépassent minuit (début à 7 h).`,
        );
      }

      const tags = lue.tags.map((tag) => {
        const parametre = tagParNom.get(normaliser(tag));
        return {
          libelle: parametre ?? tag,
          parametre: parametre !== undefined,
        };
      });
      if (erreurs.length > avant || !plage || plage.fin > 24 * 60) {
        resolues.push({ lue, input: null, apercu: null });
        continue;
      }

      const input: PointageInput = {
        utilisateurId,
        debut: instantParis(lue.jour!, plage.debut),
        fin: instantParis(lue.jour!, plage.fin),
        typeAction: lue.type,
        clientId: client?.id ?? null,
        commandeId: commande?.id ?? null,
        contactId: contact?.id ?? null,
        description:
          joinTags(
            tags.map((tag) => tag.libelle),
            lue.description,
          ) || null,
        // Comme la saisie : facturable, temps facturable = durée.
        facturable: FACTURABLE.oui,
        tempsFacturable: lue.heures,
      };
      // Règles de la saisie (type ↔ client, commande sous contrat, contact…).
      for (const regle of await this.saisie.erreursSaisie(input)) {
        const lettre = COLONNE_DU_CHAMP[regle.field];
        erreurs.push({
          ligne: lue.numero,
          colonne: lettre ? libelleColonne(lettre) : null,
          valeur: lettre ? valeurDe(lue, lettre) : null,
          message: regle.message,
        });
      }
      if (erreurs.length > avant) {
        resolues.push({ lue, input: null, apercu: null });
        continue;
      }
      resolues.push({
        lue,
        input,
        apercu: {
          ligne: lue.numero,
          jour: lue.jour!,
          debut: heureMinute(plage.debut),
          fin: heureMinute(plage.fin),
          client: client?.code ?? null,
          type: lue.type,
          commande: commande?.numero ?? null,
          contact: lue.contact,
          tags,
          description: lue.description,
          heures: lue.heures!,
        },
      });
    }
    return resolues;
  }
}

export function valide(resultat: ResultatImport): boolean {
  return !!resultat.format?.conforme && resultat.erreurs.length === 0;
}

/**
 * Commande du client portant ce numéro (n° de commande, sinon de devis) :
 * celle qui n'est pas clôturée ; sinon un message d'erreur.
 */
export function choisirCommande(
  commandes: readonly CommandeOption[],
  numero: string,
): CommandeOption | string {
  const memeNumero = commandes.filter(
    (commande) => normaliser(commande.numero) === normaliser(numero),
  );
  if (memeNumero.length === 0) {
    return `Aucune commande « ${numero} » pour le client {client}.`;
  }
  const enCours = memeNumero.filter((commande) => !commande.cloturee);
  if (enCours.length === 0) {
    return `La commande « ${numero} » du client {client} est clôturée.`;
  }
  if (enCours.length > 1) {
    return `Plusieurs commandes « ${numero} » en cours pour le client {client} : numéro ambigu.`;
  }
  return enCours[0]!;
}

/** Contact « NOM Prénom » (stocké « NOM,Prénom ») ; actif de préférence. */
export function choisirContact(
  contacts: readonly ContactOption[],
  nom: string,
): ContactOption | null {
  const cible = normaliser(nom.replace(',', ' '));
  const memeNom = contacts.filter(
    (contact) => normaliser((contact.nom ?? '').replace(',', ' ')) === cible,
  );
  return memeNom.find((contact) => contact.actif) ?? memeNom[0] ?? null;
}

function erreurFichier(message: string): ErreurImport {
  return { ligne: null, colonne: null, valeur: null, message };
}

function valeurDe(lue: LigneLue, lettre: LettreColonne): string | null {
  switch (lettre) {
    case 'A':
      return lue.client;
    case 'B':
      return lue.type;
    case 'D':
      return lue.commande;
    case 'E':
      return lue.jour ? jourFr(lue.jour) : null;
    case 'F':
      return lue.heures === null ? null : String(lue.heures);
    case 'H':
      return lue.contact;
    default:
      return null;
  }
}

function jourFr(jour: string): string {
  return `${jour.slice(8, 10)}/${jour.slice(5, 7)}/${jour.slice(0, 4)}`;
}

/** Résultat mis en cache par clé (une requête par client). */
function memo<T>(
  charger: (cle: number) => Promise<T>,
): (cle: number) => Promise<T> {
  const cache = new Map<number, Promise<T>>();
  return (cle) => {
    if (!cache.has(cle)) {
      cache.set(cle, charger(cle));
    }
    return cache.get(cle)!;
  };
}
