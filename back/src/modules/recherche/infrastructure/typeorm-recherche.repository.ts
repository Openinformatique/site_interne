import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, type ObjectLiteral } from 'typeorm';
import { TypeOrmFilterHelper } from '../../../common/pagination/typeorm-filter.helper';
import {
  jourMetier,
  sqlDateToIso,
  sqlUtcText,
  utcTextToDate,
} from '../../../common/utils/sql-date.util';
import { ClientContratEntity } from '../../clients/infrastructure/entities/client-contrat.entity';
import { ClientEntity } from '../../clients/infrastructure/entities/client.entity';
import { CommandeEntity } from '../../commandes/infrastructure/entities/commande.entity';
import { ParametreEntity } from '../../parametres/infrastructure/entities/parametre.entity';
import { PointageEntity } from '../../pointages/infrastructure/entities/pointage.entity';
import { UserEntity } from '../../users/infrastructure/entities/user.entity';
import type {
  ClientTrouve,
  CommandeTrouvee,
  PointageTrouve,
  RecherchePort,
  Trouves,
} from '../domain/recherche.port';

/**
 * Textes dans lesquels portent les recherches, comparés sans tenir compte de
 * la casse ni des accents : mêmes champs que les listes des clients et des
 * commandes (montant exclu), et pour un pointage sa description (tags
 * compris), son client et sa commande.
 */
const TEXTE_CLIENT =
  "CONCAT_WS(' ', client.codeClient, client.raisonSociale, client.adresse1, " +
  'client.adresse2, client.adresse3, client.codePostal, client.ville, ' +
  'client.codePays, client.numeroTva, client.groupe, pays.zoneParametre) ' +
  'COLLATE Latin1_General_CI_AI';

const TEXTE_COMMANDE =
  "CONCAT_WS(' ', commande.numeroCommandeClient, commande.numeroDevis, " +
  'commande.libelleCommande, client.codeClient, client.raisonSociale, ' +
  'contrat.libelleContrat) COLLATE Latin1_General_CI_AI';

const TEXTE_POINTAGE =
  "CONCAT_WS(' ', pointage.description, client.codeClient, " +
  'client.raisonSociale, commande.numeroCommandeClient, commande.numeroDevis) ' +
  'COLLATE Latin1_General_CI_AI';

/** Adaptateur TypeORM du port RecherchePort (lecture seule). */
@Injectable()
export class TypeOrmRechercheRepository implements RecherchePort {
  constructor(
    @InjectRepository(ClientEntity)
    private readonly clientsRepo: Repository<ClientEntity>,
    @InjectRepository(CommandeEntity)
    private readonly commandesRepo: Repository<CommandeEntity>,
    @InjectRepository(PointageEntity)
    private readonly pointagesRepo: Repository<PointageEntity>,
  ) {}

  async clients(
    termes: readonly string[],
    limite: number,
  ): Promise<Trouves<ClientTrouve>> {
    const qb = filtrer(
      this.clientsRepo
        .createQueryBuilder('client')
        .leftJoin(
          ParametreEntity,
          'pays',
          "pays.codeTable = 'PAYS' AND pays.numRubrique = '01' AND pays.cleParametre = client.codePays",
        ),
      TEXTE_CLIENT,
      termes,
    );
    const total = await qb.getCount();
    const rows = await qb
      .select('client.id', 'id')
      .addSelect('client.codeClient', 'codeClient')
      .addSelect('client.raisonSociale', 'raisonSociale')
      .addSelect('client.ville', 'ville')
      .addSelect('client.groupe', 'groupe')
      .addSelect('client.actif', 'actif')
      // Actifs d'abord, puis par raison sociale.
      .orderBy('client.actif', 'DESC')
      .addOrderBy('client.raisonSociale', 'ASC')
      .addOrderBy('client.id', 'ASC')
      .limit(limite)
      .getRawMany<{
        id: number;
        codeClient: string | null;
        raisonSociale: string | null;
        ville: string | null;
        groupe: string | null;
        actif: boolean | number;
      }>();
    return {
      total,
      items: rows.map((row) => ({
        id: Number(row.id),
        codeClient: trim(row.codeClient),
        raisonSociale: trim(row.raisonSociale),
        ville: trim(row.ville),
        groupe: trim(row.groupe),
        actif: Boolean(row.actif),
      })),
    };
  }

  async commandes(
    termes: readonly string[],
    limite: number,
  ): Promise<Trouves<CommandeTrouvee>> {
    const qb = filtrer(
      this.commandesRepo
        .createQueryBuilder('commande')
        .innerJoin(ClientEntity, 'client', 'client.id = commande.clientId')
        .leftJoin(
          ClientContratEntity,
          'contrat',
          'contrat.id = commande.clientContratId',
        ),
      TEXTE_COMMANDE,
      termes,
    );
    const total = await qb.getCount();
    const rows = await qb
      .select('commande.id', 'id')
      .addSelect('client.id', 'clientId')
      .addSelect('client.codeClient', 'codeClient')
      .addSelect('client.raisonSociale', 'client')
      .addSelect('commande.numeroCommandeClient', 'numeroCommande')
      .addSelect('commande.numeroDevis', 'numeroDevis')
      .addSelect('commande.libelleCommande', 'libelle')
      .addSelect('contrat.libelleContrat', 'contrat')
      .addSelect('commande.dateCommande', 'dateCommande')
      .addSelect('commande.dateCloture', 'dateCloture')
      // En cours d'abord, puis la plus récente.
      .orderBy(
        'CASE WHEN commande.dateCloture IS NULL THEN 0 ELSE 1 END',
        'ASC',
      )
      .addOrderBy('commande.dateCommande', 'DESC')
      .addOrderBy('commande.id', 'DESC')
      .limit(limite)
      .getRawMany<{
        id: number;
        clientId: number;
        codeClient: string | null;
        client: string | null;
        numeroCommande: string | null;
        numeroDevis: string | null;
        libelle: string | null;
        contrat: string | null;
        dateCommande: Date | string | null;
        dateCloture: Date | string | null;
      }>();
    return {
      total,
      items: rows.map((row) => ({
        id: Number(row.id),
        clientId: Number(row.clientId),
        codeClient: trim(row.codeClient),
        client: trim(row.client),
        numeroCommande: trim(row.numeroCommande),
        numeroDevis: trim(row.numeroDevis),
        libelle: trim(row.libelle),
        contrat: trim(row.contrat),
        dateCommande: sqlDateToIso(row.dateCommande),
        cloturee: row.dateCloture !== null,
      })),
    };
  }

  async pointages(
    termes: readonly string[],
    utilisateurId: string | null,
    limite: number,
  ): Promise<Trouves<PointageTrouve> & { heures: number }> {
    const base = () => {
      const qb = filtrer(
        this.pointagesRepo
          .createQueryBuilder('pointage')
          .leftJoin(ClientEntity, 'client', 'client.id = pointage.clientId')
          .leftJoin(
            CommandeEntity,
            'commande',
            'commande.id = pointage.commandeId',
          )
          .andWhere('pointage.dateHeureDebut IS NOT NULL')
          .andWhere('pointage.dateHeureFin IS NOT NULL'),
        TEXTE_POINTAGE,
        termes,
      );
      if (utilisateurId !== null) {
        qb.andWhere('pointage.utilisateurId = :utilisateurId', {
          utilisateurId,
        });
      }
      return qb;
    };

    const somme = await base()
      .select('COUNT(*)', 'total')
      .addSelect(
        'COALESCE(SUM(DATEDIFF(second, pointage.dateHeureDebut, pointage.dateHeureFin)), 0)',
        'secondes',
      )
      .getRawOne<{ total: number | string; secondes: number | string }>();
    const rows = await base()
      .leftJoin(UserEntity, 'salarie', 'salarie.id = pointage.utilisateurId')
      .select('pointage.id', 'id')
      .addSelect('pointage.utilisateurId', 'utilisateurId')
      .addSelect('salarie.displayName', 'personne')
      .addSelect(sqlUtcText('pointage.dateHeureDebut'), 'debut')
      .addSelect(
        'DATEDIFF(second, pointage.dateHeureDebut, pointage.dateHeureFin)',
        'secondes',
      )
      .addSelect('client.codeClient', 'codeClient')
      .addSelect(
        'COALESCE(commande.numeroCommandeClient, commande.numeroDevis)',
        'commande',
      )
      .addSelect('pointage.typeAction', 'type')
      .addSelect('pointage.description', 'description')
      .orderBy('pointage.dateHeureDebut', 'DESC')
      .addOrderBy('pointage.id', 'DESC')
      .limit(limite)
      .getRawMany<{
        id: number;
        utilisateurId: string;
        personne: string | null;
        debut: string;
        secondes: number | string;
        codeClient: string | null;
        commande: string | null;
        type: string | null;
        description: string | null;
      }>();
    return {
      total: Number(somme?.total ?? 0),
      heures: arrondi(Number(somme?.secondes ?? 0) / 3600),
      items: rows.map((row) => {
        const debut = utcTextToDate(row.debut);
        return {
          id: Number(row.id),
          utilisateurId: row.utilisateurId,
          personne: trim(row.personne),
          debut,
          jour: jourMetier(debut),
          codeClient: trim(row.codeClient),
          commande: trim(row.commande),
          type: trim(row.type),
          heures: arrondi(Number(row.secondes) / 3600),
          description: trim(row.description),
        };
      }),
    };
  }
}

/** Chaque terme doit figurer dans le texte ; jokers LIKE neutralisés. */
function filtrer<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  texte: string,
  termes: readonly string[],
): SelectQueryBuilder<T> {
  termes.forEach((terme, index) => {
    qb.andWhere(`${texte} LIKE :terme${index}`, {
      [`terme${index}`]: `%${TypeOrmFilterHelper.escapeLikeValue(terme)}%`,
    });
  });
  return qb;
}

function trim(value: string | null): string | null {
  return value?.trim() || null;
}

function arrondi(value: number): number {
  return Math.round(value * 100) / 100;
}
