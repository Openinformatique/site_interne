import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { CommandeEntity } from '../../commandes/infrastructure/entities/commande.entity';
import { ParametreEntity } from '../../parametres/infrastructure/entities/parametre.entity';
import { PointageEntity } from '../../pointages/infrastructure/entities/pointage.entity';
import { UserEntity } from '../../users/infrastructure/entities/user.entity';
import type {
  ClientCommandesFilter,
  ClientDetail,
  ClientFichePort,
  ClientInput,
  CommandeSummary,
  Contact,
  ContactInput,
  ContratAssistance,
  ContratInput,
  ContratMouvement,
  ContratSummary,
} from '../domain/client-fiche.port';
import { joinNomContact, splitNomContact } from '../domain/contact-name';
import {
  debutDuSuivi,
  mouvementArrete,
  nomDemandeur,
  pointageDansLeSuivi,
} from '../domain/contrat-suivi';
import { ClientContratEntity } from './entities/client-contrat.entity';
import { ClientEntity } from './entities/client.entity';
import { ContactEntity } from './entities/contact.entity';
import {
  jourMetier,
  sqlDateToIso,
  sqlUtcText,
  utcTextToDate,
} from '../../../common/utils/sql-date.util';

/** Heures par jour si le paramètre TDIV/HJOUR est absent ou invalide. */
const DEFAULT_HEURES_PAR_JOUR = 8;

/** Adaptateur TypeORM du port ClientFichePort. */
@Injectable()
export class TypeOrmClientFicheRepository implements ClientFichePort {
  constructor(
    @InjectRepository(ClientEntity)
    private readonly clients: Repository<ClientEntity>,
    @InjectRepository(ClientContratEntity)
    private readonly contrats: Repository<ClientContratEntity>,
    @InjectRepository(ContactEntity)
    private readonly contacts: Repository<ContactEntity>,
    @InjectRepository(CommandeEntity)
    private readonly commandes: Repository<CommandeEntity>,
    @InjectRepository(PointageEntity)
    private readonly pointages: Repository<PointageEntity>,
    @InjectRepository(ParametreEntity)
    private readonly parametres: Repository<ParametreEntity>,
  ) {}

  // --- Client ---------------------------------------------------------------

  async findClient(id: number): Promise<ClientDetail | null> {
    const row = await this.clients
      .createQueryBuilder('client')
      .leftJoin(UserEntity, 'creator', 'creator.id = client.createdBy')
      .leftJoin(UserEntity, 'updater', 'updater.id = client.updatedBy')
      .addSelect('creator.displayName', 'creatorName')
      .addSelect('updater.displayName', 'updaterName')
      .where('client.id = :id', { id })
      .getRawAndEntities();
    const entity = row.entities[0];
    if (!entity) {
      return null;
    }
    const raw = row.raw[0] as {
      creatorName: string | null;
      updaterName: string | null;
    };
    return {
      id: entity.id,
      codeClient: entity.codeClient,
      raisonSociale: entity.raisonSociale,
      actif: entity.actif,
      adresse1: entity.adresse1,
      adresse2: entity.adresse2,
      adresse3: entity.adresse3,
      codePostal: entity.codePostal,
      ville: entity.ville,
      codePays: entity.codePays,
      groupe: entity.groupe || null,
      numeroTva: entity.numeroTva,
      modeReglement: entity.modeReglement || null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      createdBy: raw.creatorName ?? null,
      updatedBy: raw.updaterName ?? null,
    };
  }

  async codeExists(codeClient: string, excludeId?: number): Promise<boolean> {
    const qb = this.clients
      .createQueryBuilder('client')
      .where('UPPER(client.codeClient) = :code', {
        code: codeClient.toUpperCase(),
      });
    if (excludeId !== undefined) {
      qb.andWhere('client.id <> :excludeId', { excludeId });
    }
    return (await qb.getCount()) > 0;
  }

  async createClient(input: ClientInput, userId: string): Promise<number> {
    const saved = await this.clients.save(
      this.clients.create({ ...input, createdBy: userId, updatedBy: userId }),
    );
    return saved.id;
  }

  async updateClient(
    id: number,
    input: ClientInput,
    userId: string,
  ): Promise<void> {
    await this.clients.update({ id }, { ...input, updatedBy: userId });
  }

  // --- Contrats -------------------------------------------------------------

  async listContrats(
    clientId: number,
    heuresParJour: number,
  ): Promise<ContratSummary[]> {
    const contrats = await this.contrats.find({
      where: { clientId },
      order: { dateMiseEnPlace: 'DESC', id: 'DESC' },
    });
    if (contrats.length === 0) {
      return [];
    }
    const ids = contrats.map((contrat) => contrat.id);

    const credits = await this.commandes
      .createQueryBuilder('commande')
      .select('commande.clientContratId', 'contratId')
      .addSelect('SUM(COALESCE(commande.nbJoursCommande, 0))', 'jours')
      .addSelect(
        'MIN(COALESCE(commande.dateCommande, commande.dateDevis))',
        'premiere',
      )
      .where('commande.clientContratId IN (:...ids)', { ids })
      .groupBy('commande.clientContratId')
      .getRawMany<{
        contratId: number;
        jours: string | number;
        premiere: Date | string | null;
      }>();

    // Pointages lus un à un : seul le jour à Paris permet d'écarter ceux
    // antérieurs à la première commande (voir contrat-suivi.ts).
    const pointages = await this.pointages
      .createQueryBuilder('pointage')
      .innerJoin(
        CommandeEntity,
        'commande',
        'commande.id = pointage.commandeId AND commande.deletedAt IS NULL',
      )
      .select('commande.clientContratId', 'contratId')
      .addSelect(sqlUtcText('pointage.dateHeureDebut'), 'debut')
      .addSelect('pointage.tempsFacturable', 'heures')
      .where('commande.clientContratId IN (:...ids)', { ids })
      .getRawMany<{
        contratId: number;
        debut: string | null;
        heures: string | number | null;
      }>();

    const creditBy = new Map(
      credits.map((c) => [
        Number(c.contratId),
        Number(c.jours) * heuresParJour,
      ]),
    );
    const debutBy = new Map(
      credits.map((c) => [Number(c.contratId), sqlDateToIso(c.premiere)]),
    );
    const debitBy = new Map<number, number>();
    for (const pointage of pointages) {
      const contratId = Number(pointage.contratId);
      const jour = pointage.debut
        ? jourMetier(utcTextToDate(pointage.debut))
        : null;
      if (pointageDansLeSuivi(jour, debutBy.get(contratId) ?? null)) {
        debitBy.set(
          contratId,
          (debitBy.get(contratId) ?? 0) + Number(pointage.heures ?? 0),
        );
      }
    }

    return contrats.map((contrat) => {
      const credit = round4(creditBy.get(contrat.id) ?? 0);
      const debit = round4(debitBy.get(contrat.id) ?? 0);
      return {
        id: contrat.id,
        libelleContrat: contrat.libelleContrat,
        dateMiseEnPlace: contrat.dateMiseEnPlace,
        dateEcheance: contrat.dateEcheance,
        credit,
        debit,
        restant: round4(credit - debit),
      };
    });
  }

  async contratBelongsTo(
    clientId: number,
    contratId: number,
  ): Promise<boolean> {
    return (await this.contrats.countBy({ id: contratId, clientId })) > 0;
  }

  async listMouvements(
    contratId: number,
    heuresParJour: number,
    arreteAu: string | null = null,
  ): Promise<ContratMouvement[]> {
    const parContrat = await this.listMouvementsParContrat(
      [contratId],
      heuresParJour,
      arreteAu,
    );
    return parContrat.get(contratId) ?? [];
  }

  async listMouvementsParContrat(
    contratIds: readonly number[],
    heuresParJour: number,
    arreteAu: string | null = null,
  ): Promise<Map<number, ContratMouvement[]>> {
    const resultat = new Map<number, ContratMouvement[]>();
    if (contratIds.length === 0) {
      return resultat;
    }
    // Deux requêtes pour tous les contrats (édition groupée : plusieurs dizaines).
    const commandes = await this.commandes.find({
      where: { clientContratId: In([...contratIds]) },
    });
    const pointages =
      commandes.length === 0
        ? []
        : await this.pointages
            .createQueryBuilder('pointage')
            .leftJoin(
              UserEntity,
              'salarie',
              'salarie.id = pointage.utilisateurId',
            )
            .leftJoin(
              ContactEntity,
              'contact',
              'contact.id = pointage.contactId',
            )
            .select('pointage.commandeId', 'commandeId')
            // Instant UTC lu en texte, puis jour à Paris (voir sql-date.util).
            .addSelect(sqlUtcText('pointage.dateHeureDebut'), 'debut')
            .addSelect('pointage.description', 'description')
            .addSelect('pointage.tempsFacturable', 'heures')
            .addSelect('salarie.login', 'login')
            .addSelect('contact.nomContact', 'contact')
            .where('pointage.commandeId IN (:...ids)', {
              ids: commandes.map((c) => c.id),
            })
            .getRawMany<{
              commandeId: number;
              debut: string | null;
              description: string | null;
              heures: string | null;
              login: string | null;
              contact: string | null;
            }>();

    const contratDeCommande = new Map(
      commandes.map((c) => [c.id, c.clientContratId]),
    );
    for (const contratId of contratIds) {
      resultat.set(
        contratId,
        this.mouvementsDuContrat(
          commandes.filter((c) => c.clientContratId === contratId),
          pointages.filter(
            (p) => contratDeCommande.get(Number(p.commandeId)) === contratId,
          ),
          heuresParJour,
          arreteAu,
        ),
      );
    }
    return resultat;
  }

  private mouvementsDuContrat(
    commandes: CommandeEntity[],
    pointages: {
      debut: string | null;
      description: string | null;
      heures: string | null;
      login: string | null;
      contact: string | null;
    }[],
    heuresParJour: number,
    arreteAu: string | null,
  ): ContratMouvement[] {
    if (commandes.length === 0) {
      return [];
    }
    const debut = debutDuSuivi(
      commandes.map((c) => c.dateCommande ?? c.dateDevis),
    );
    const mouvements: ContratMouvement[] = [
      ...commandes.map((commande) => ({
        type: 'COMMANDE' as const,
        date: commande.dateCommande ?? commande.dateDevis,
        // « N° — libellé », ex. « 26/383 — Ajout 240 heures ».
        libelle: [
          commande.numeroCommandeClient ?? commande.numeroDevis,
          commande.libelleCommande,
        ]
          .filter(Boolean)
          .join(' — '),
        nature:
          commande.libelleCommande?.trim() ||
          commande.numeroCommandeClient ||
          commande.numeroDevis ||
          '',
        utilisateur: null,
        demandeur: null,
        credit: round4(Number(commande.nbJoursCommande ?? 0) * heuresParJour),
        debit: 0,
      })),
      ...pointages
        .map((pointage) => ({
          type: 'POINTAGE' as const,
          date: pointage.debut
            ? jourMetier(utcTextToDate(pointage.debut))
            : null,
          libelle: pointage.description ?? '',
          nature: pointage.description?.trim() ?? '',
          utilisateur: pointage.login,
          demandeur: nomDemandeur(pointage.contact),
          credit: 0,
          debit: round4(Number(pointage.heures ?? 0)),
        }))
        .filter((pointage) => pointageDansLeSuivi(pointage.date, debut)),
    ];
    // Date décroissante ; à date égale, la commande sous les pointages
    // (elle les précède chronologiquement).
    return mouvements
      .filter((mouvement) => mouvementArrete(mouvement.date, arreteAu))
      .sort(
        (a, b) =>
          (b.date ?? '').localeCompare(a.date ?? '') ||
          (a.type === b.type ? 0 : a.type === 'COMMANDE' ? 1 : -1),
      );
  }

  async listContratsAssistance(): Promise<ContratAssistance[]> {
    const rows = await this.contrats
      .createQueryBuilder('contrat')
      .innerJoin(ClientEntity, 'client', 'client.id = contrat.clientId')
      .leftJoin(
        ParametreEntity,
        'gsoc',
        "gsoc.codeTable = 'GSOC' AND gsoc.numRubrique = '01' AND gsoc.cleParametre = client.groupe",
      )
      .select('contrat.id', 'id')
      .addSelect('contrat.libelleContrat', 'libelleContrat')
      .addSelect('contrat.dateMiseEnPlace', 'dateMiseEnPlace')
      .addSelect('contrat.dateEcheance', 'dateEcheance')
      .addSelect('client.id', 'clientId')
      .addSelect('client.raisonSociale', 'raisonSociale')
      .addSelect('client.codeClient', 'codeClient')
      .addSelect('client.groupe', 'groupe')
      .addSelect('gsoc.zoneParametre', 'groupeLibelle')
      .orderBy('client.raisonSociale', 'ASC')
      .addOrderBy('contrat.libelleContrat', 'ASC')
      .getRawMany<{
        id: number;
        libelleContrat: string | null;
        dateMiseEnPlace: Date | string | null;
        dateEcheance: Date | string | null;
        clientId: number;
        raisonSociale: string | null;
        codeClient: string | null;
        groupe: string | null;
        groupeLibelle: string | null;
      }>();
    return rows.map((row) => ({
      id: Number(row.id),
      libelleContrat: row.libelleContrat?.trim() || null,
      dateMiseEnPlace: sqlDateToIso(row.dateMiseEnPlace),
      dateEcheance: sqlDateToIso(row.dateEcheance),
      clientId: Number(row.clientId),
      clientNom: row.raisonSociale?.trim() || row.codeClient?.trim() || '',
      groupe: row.groupe?.trim() || null,
      groupeLibelle: row.groupeLibelle?.trim() || null,
    }));
  }

  async createContrat(
    clientId: number,
    input: ContratInput,
    userId: string,
  ): Promise<number> {
    const saved = await this.contrats.save(
      this.contrats.create({
        ...input,
        clientId,
        createdBy: userId,
        updatedBy: userId,
      }),
    );
    return saved.id;
  }

  async updateContrat(
    contratId: number,
    input: ContratInput,
    userId: string,
  ): Promise<void> {
    await this.contrats.update(
      { id: contratId },
      { ...input, updatedBy: userId },
    );
  }

  // --- Contacts -------------------------------------------------------------

  async listContacts(clientId: number): Promise<Contact[]> {
    const contacts = await this.contacts.find({ where: { clientId } });
    return contacts
      .map((contact) => {
        const { nom, prenom } = splitNomContact(contact.nomContact);
        return {
          id: contact.id,
          civilite: contact.civilite ?? 0,
          nom,
          prenom,
          poste: contact.poste ?? '',
          telephone: contact.numeroTelephone,
          adresseEmail: contact.adresseEmail,
          actif: contact.actif,
        };
      })
      .sort(
        (a, b) =>
          a.nom.localeCompare(b.nom, 'fr') ||
          (a.prenom ?? '').localeCompare(b.prenom ?? '', 'fr'),
      );
  }

  async contactBelongsTo(
    clientId: number,
    contactId: number,
  ): Promise<boolean> {
    return (await this.contacts.countBy({ id: contactId, clientId })) > 0;
  }

  async createContact(
    clientId: number,
    input: ContactInput,
    userId: string,
  ): Promise<number> {
    const saved = await this.contacts.save(
      this.contacts.create({
        ...toContactColumns(input),
        clientId,
        createdBy: userId,
        updatedBy: userId,
      }),
    );
    return saved.id;
  }

  async updateContact(
    contactId: number,
    input: ContactInput,
    userId: string,
  ): Promise<void> {
    await this.contacts.update(
      { id: contactId },
      { ...toContactColumns(input), updatedBy: userId },
    );
  }

  // --- Commandes ------------------------------------------------------------

  async listCommandes(
    clientId: number,
    filter: ClientCommandesFilter,
    heuresParJour: number,
  ): Promise<CommandeSummary[]> {
    const heuresPointees = this.pointages
      .createQueryBuilder('pointage')
      .select('COALESCE(SUM(pointage.tempsFacturable), 0)')
      .where('pointage.commandeId = commande.id');

    const qb = this.commandes
      .createQueryBuilder('commande')
      .leftJoin(
        ClientContratEntity,
        'contrat',
        'contrat.id = commande.clientContratId',
      )
      .select('commande.id', 'id')
      .addSelect('commande.numeroCommandeClient', 'numeroCommande')
      .addSelect('commande.numeroDevis', 'numeroDevis')
      .addSelect('commande.dateDevis', 'dateDevis')
      .addSelect('commande.dateCommande', 'dateCommande')
      .addSelect('commande.typeCommande', 'typeCommande')
      .addSelect('contrat.libelleContrat', 'contrat')
      .addSelect('commande.delai', 'delai')
      .addSelect('commande.nbJoursPrevus', 'joursPrevus')
      .addSelect(`(${heuresPointees.getQuery()})`, 'heures')
      .addSelect('commande.libelleCommande', 'libelle')
      .addSelect('commande.dateCloture', 'dateCloture')
      .where('commande.clientId = :clientId', { clientId });

    if (!filter.includeClosed) {
      qb.andWhere('commande.dateCloture IS NULL');
    }
    if (filter.du || filter.au) {
      qb.andWhere(
        new Brackets((periode) => {
          periode
            .orWhere(periodCondition('commande.dateDevis', filter))
            .orWhere(periodCondition('commande.dateCommande', filter));
        }),
        { du: filter.du, au: filter.au },
      );
    }

    const rows = await qb
      .orderBy('commande.dateDevis', 'DESC')
      .addOrderBy('commande.id', 'DESC')
      .getRawMany<RawCommande>();

    return rows.map((row) => ({
      id: row.id,
      numeroCommande: row.numeroCommande,
      numeroDevis: row.numeroDevis,
      dateDevis: sqlDateToIso(row.dateDevis),
      dateCommande: sqlDateToIso(row.dateCommande),
      typeCommande: row.typeCommande || null,
      contrat: row.contrat,
      delai: sqlDateToIso(row.delai),
      joursPrevus: row.joursPrevus === null ? null : Number(row.joursPrevus),
      joursPasses: round4(Number(row.heures ?? 0) / heuresParJour),
      libelle: row.libelle,
      dateCloture: sqlDateToIso(row.dateCloture),
    }));
  }

  // --- Paramètres -----------------------------------------------------------

  async heuresParJour(): Promise<number> {
    const parametre = await this.parametres.findOneBy({
      codeTable: 'TDIV',
      cleParametre: 'HJOUR',
      numRubrique: '02',
    });
    const value = Number(parametre?.zoneParametre?.replace(',', '.'));
    return Number.isFinite(value) && value > 0
      ? value
      : DEFAULT_HEURES_PAR_JOUR;
  }
}

interface RawCommande {
  id: number;
  numeroCommande: string | null;
  numeroDevis: string | null;
  dateDevis: Date | string | null;
  dateCommande: Date | string | null;
  typeCommande: string | null;
  contrat: string | null;
  delai: Date | string | null;
  joursPrevus: string | number | null;
  heures: string | number | null;
  libelle: string | null;
  dateCloture: Date | string | null;
}

function periodCondition(
  column: string,
  filter: ClientCommandesFilter,
): string {
  const bounds = [
    filter.du ? `${column} >= :du` : null,
    filter.au ? `${column} <= :au` : null,
  ].filter(Boolean);
  return `(${bounds.join(' AND ')})`;
}

function toContactColumns(input: ContactInput): Partial<ContactEntity> {
  return {
    nomContact: joinNomContact(input.nom, input.prenom),
    civilite: input.civilite,
    poste: input.poste,
    numeroTelephone: input.telephone,
    adresseEmail: input.adresseEmail,
    actif: input.actif,
  };
}

/** Date SQL (Date ou chaîne) → YYYY-MM-DD. */

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
