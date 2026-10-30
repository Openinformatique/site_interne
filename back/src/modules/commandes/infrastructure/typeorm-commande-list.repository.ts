import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { TypeOrmFilterHelper } from '../../../common/pagination/typeorm-filter.helper';
import { ClientContratEntity } from '../../clients/infrastructure/entities/client-contrat.entity';
import { ClientEntity } from '../../clients/infrastructure/entities/client.entity';
import { ParametreEntity } from '../../parametres/infrastructure/entities/parametre.entity';
import { PointageEntity } from '../../pointages/infrastructure/entities/pointage.entity';
import type {
  CommandeClientOption,
  CommandeListItem,
  CommandeListPort,
  CommandeSortField,
  CommandesFilter,
  CommandesPage,
  ListCommandesQuery,
} from '../domain/commande-list.port';
import { CommandeEntity } from './entities/commande.entity';
import { sqlDateToIso } from '../../../common/utils/sql-date.util';

/** Heures d'une journée si le paramètre TDIV/HJOUR est absent ou invalide. */
const DEFAULT_HEURES_PAR_JOUR = 8;

/** Nombre maximal de mots pris en compte dans une recherche. */
const MAX_SEARCH_TERMS = 8;

/**
 * Texte dans lequel porte la recherche, comparé sans tenir compte de la
 * casse ni des accents. Le montant y figure avec le point et la virgule
 * décimale (« 1250.50 » comme « 1250,50 »).
 */
const SEARCH_HAYSTACK =
  "CONCAT_WS(' ', commande.numeroCommandeClient, commande.numeroDevis, " +
  'commande.libelleCommande, client.codeClient, client.raisonSociale, ' +
  'contrat.libelleContrat, CAST(commande.montant AS nvarchar(40)), ' +
  "REPLACE(CAST(commande.montant AS nvarchar(40)), '.', ',')) " +
  'COLLATE Latin1_General_CI_AI';

/** Adaptateur TypeORM du port CommandeListPort. */
@Injectable()
export class TypeOrmCommandeListRepository implements CommandeListPort {
  constructor(
    @InjectRepository(CommandeEntity)
    private readonly commandes: Repository<CommandeEntity>,
    @InjectRepository(PointageEntity)
    private readonly pointages: Repository<PointageEntity>,
    @InjectRepository(ParametreEntity)
    private readonly parametres: Repository<ParametreEntity>,
    @InjectRepository(ClientEntity)
    private readonly clients: Repository<ClientEntity>,
  ) {}

  async findPage(
    query: ListCommandesQuery,
    heuresParJour: number,
  ): Promise<CommandesPage> {
    const totalItems = await this.filtered(query).getCount();
    const rows = await this.selectRows(this.filtered(query), query)
      .offset((query.page - 1) * query.limit)
      .limit(query.limit)
      .getRawMany<RawCommande>();
    return {
      items: rows.map((row) => toItem(row, heuresParJour)),
      totalItems,
    };
  }

  async findAll(
    filter: CommandesFilter,
    heuresParJour: number,
  ): Promise<CommandeListItem[]> {
    const rows = await this.selectRows(
      this.filtered(filter),
      filter,
    ).getRawMany<RawCommande>();
    return rows.map((row) => toItem(row, heuresParJour));
  }

  async listClients(): Promise<CommandeClientOption[]> {
    // Clients (actifs ou non) ayant au moins une commande.
    const rows = await this.clients
      .createQueryBuilder('client')
      .select('client.id', 'id')
      .addSelect('client.codeClient', 'codeClient')
      .addSelect('client.raisonSociale', 'raisonSociale')
      .where(
        `EXISTS (${this.commandes
          .createQueryBuilder('commande')
          .select('1')
          .where('commande.clientId = client.id')
          .getQuery()})`,
      )
      .orderBy('client.raisonSociale', 'ASC')
      .addOrderBy('client.id', 'ASC')
      .getRawMany<CommandeClientOption>();
    return rows.map((row) => ({
      id: row.id,
      codeClient: row.codeClient,
      raisonSociale: row.raisonSociale,
    }));
  }

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

  /** Commandes du filtre, jointes au client (non supprimé) et au contrat. */
  private filtered(
    filter: CommandesFilter,
  ): SelectQueryBuilder<CommandeEntity> {
    const qb = this.commandes
      .createQueryBuilder('commande')
      .innerJoin(ClientEntity, 'client', 'client.id = commande.clientId')
      .leftJoin(
        ClientContratEntity,
        'contrat',
        'contrat.id = commande.clientContratId',
      );

    if (!filter.includeClosed) {
      qb.andWhere('commande.dateCloture IS NULL');
    }
    if (filter.clientId !== undefined) {
      qb.andWhere('commande.clientId = :clientId', {
        clientId: filter.clientId,
      });
    }
    if (filter.groupes.length > 0 || filter.sansGroupe) {
      qb.andWhere(
        new Brackets((groupe) => {
          if (filter.groupes.length > 0) {
            groupe.orWhere('client.groupe IN (:...groupes)', {
              groupes: filter.groupes,
            });
          }
          if (filter.sansGroupe) {
            groupe.orWhere("(client.groupe IS NULL OR client.groupe = '')");
          }
        }),
      );
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

    // Chaque mot doit être présent ; jokers LIKE neutralisés.
    (filter.search ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, MAX_SEARCH_TERMS)
      .forEach((term, index) => {
        qb.andWhere(`${SEARCH_HAYSTACK} LIKE :term${index}`, {
          [`term${index}`]: `%${TypeOrmFilterHelper.escapeLikeValue(term)}%`,
        });
      });
    return qb;
  }

  /** Colonnes de la liste, tri demandé puis date de commande décroissante. */
  private selectRows(
    qb: SelectQueryBuilder<CommandeEntity>,
    filter: CommandesFilter,
  ): SelectQueryBuilder<CommandeEntity> {
    const heures = `(${this.pointages
      .createQueryBuilder('pointage')
      .select('COALESCE(SUM(pointage.tempsFacturable), 0)')
      .where('pointage.commandeId = commande.id')
      .getQuery()})`;
    const sortColumns: Record<CommandeSortField, string> = {
      client: 'client.raisonSociale',
      groupe: 'client.groupe',
      dateCommande: 'commande.dateCommande',
      numeroCommande: 'commande.numeroCommandeClient',
      numeroDevis: 'commande.numeroDevis',
      dateDevis: 'commande.dateDevis',
      delai: 'commande.delai',
      libelle: 'commande.libelleCommande',
      joursPrevus: 'commande.nbJoursPrevus',
      joursPasses: heures,
      joursCommandes: 'commande.nbJoursCommande',
      montant: 'commande.montant',
      // En cours (sans date de clôture) avant les clôturées, en ordre croissant.
      statut: 'commande.dateCloture',
    };

    return qb
      .leftJoin(
        ParametreEntity,
        'gsoc',
        'gsoc.codeTable = :gsocTable AND gsoc.numRubrique = :gsocRubrique AND gsoc.cleParametre = client.groupe',
        { gsocTable: 'GSOC', gsocRubrique: '01' },
      )
      .select('commande.id', 'id')
      .addSelect('commande.clientId', 'clientId')
      .addSelect('client.codeClient', 'codeClient')
      .addSelect('client.raisonSociale', 'client')
      .addSelect('client.groupe', 'groupe')
      .addSelect('gsoc.zoneParametre', 'groupeLibelle')
      .addSelect('commande.dateCommande', 'dateCommande')
      .addSelect('commande.numeroCommandeClient', 'numeroCommande')
      .addSelect('commande.numeroDevis', 'numeroDevis')
      .addSelect('commande.dateDevis', 'dateDevis')
      .addSelect('commande.delai', 'delai')
      .addSelect('commande.libelleCommande', 'libelle')
      .addSelect('commande.nbJoursPrevus', 'joursPrevus')
      .addSelect(heures, 'heures')
      .addSelect('commande.nbJoursCommande', 'joursCommandes')
      .addSelect('commande.montant', 'montant')
      .addSelect('commande.dateCloture', 'dateCloture')
      .orderBy(sortColumns[filter.sortBy], filter.sortDirection)
      .addOrderBy('commande.dateCommande', 'DESC')
      .addOrderBy('commande.id', 'DESC');
  }
}

interface RawCommande {
  id: number;
  clientId: number;
  codeClient: string | null;
  client: string | null;
  groupe: string | null;
  groupeLibelle: string | null;
  dateCommande: Date | string | null;
  numeroCommande: string | null;
  numeroDevis: string | null;
  dateDevis: Date | string | null;
  delai: Date | string | null;
  libelle: string | null;
  joursPrevus: string | number | null;
  heures: string | number | null;
  joursCommandes: string | number | null;
  montant: string | number | null;
  dateCloture: Date | string | null;
}

function toItem(row: RawCommande, heuresParJour: number): CommandeListItem {
  const groupe = row.groupe || null;
  return {
    id: row.id,
    clientId: row.clientId,
    codeClient: row.codeClient,
    client: row.client,
    groupe,
    groupeLibelle: groupe ? row.groupeLibelle || groupe : null,
    dateCommande: sqlDateToIso(row.dateCommande),
    numeroCommande: row.numeroCommande,
    numeroDevis: row.numeroDevis,
    dateDevis: sqlDateToIso(row.dateDevis),
    delai: sqlDateToIso(row.delai),
    libelle: row.libelle,
    joursPrevus: toNumber(row.joursPrevus),
    joursPasses: round4(Number(row.heures ?? 0) / heuresParJour),
    joursCommandes: toNumber(row.joursCommandes),
    montant: toNumber(row.montant),
    dateCloture: sqlDateToIso(row.dateCloture),
  };
}

function periodCondition(column: string, filter: CommandesFilter): string {
  const bounds = [
    filter.du ? `${column} >= :du` : null,
    filter.au ? `${column} <= :au` : null,
  ].filter(Boolean);
  return `(${bounds.join(' AND ')})`;
}

function toNumber(value: string | number | null): number | null {
  return value === null ? null : Number(value);
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
