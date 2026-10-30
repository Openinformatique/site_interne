import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { TypeOrmFilterHelper } from '../../../common/pagination/typeorm-filter.helper';
import { ParametreEntity } from '../../parametres/infrastructure/entities/parametre.entity';
import type {
  ClientRepositoryPort,
  ClientSortField,
  ClientsPage,
  ClientSummary,
  ListClientsQuery,
} from '../domain/client-repository.port';
import { ClientEntity } from './entities/client.entity';

/** Colonne SQL de chaque champ triable (liste blanche). */
const SORT_COLUMNS: Record<ClientSortField, string> = {
  codeClient: 'client.codeClient',
  raisonSociale: 'client.raisonSociale',
  groupe: 'client.groupe',
  actif: 'client.actif',
  adresse1: 'client.adresse1',
  adresse2: 'client.adresse2',
  adresse3: 'client.adresse3',
  codePostal: 'client.codePostal',
  ville: 'client.ville',
  codePays: 'client.codePays',
};

/**
 * Texte dans lequel porte la recherche : colonnes du client et libellé du
 * pays (jointure sur le paramétrage PAYS), comparés sans tenir compte de la
 * casse ni des accents (collation CI_AI).
 */
const SEARCH_HAYSTACK =
  "CONCAT_WS(' ', client.codeClient, client.raisonSociale, client.adresse1, " +
  'client.adresse2, client.adresse3, client.codePostal, client.ville, ' +
  'client.codePays, client.numeroTva, client.groupe, pays.zoneParametre) ' +
  'COLLATE Latin1_General_CI_AI';

/** Nombre maximal de mots pris en compte dans une recherche. */
const MAX_SEARCH_TERMS = 8;

/** Adaptateur TypeORM du port ClientRepositoryPort. */
@Injectable()
export class TypeOrmClientRepository implements ClientRepositoryPort {
  constructor(
    @InjectRepository(ClientEntity)
    private readonly repository: Repository<ClientEntity>,
  ) {}

  async findPage(query: ListClientsQuery): Promise<ClientsPage> {
    // Les clients supprimés (deleted_at) sont exclus par TypeORM.
    const qb = this.repository
      .createQueryBuilder('client')
      .leftJoin(
        ParametreEntity,
        'pays',
        'pays.codeTable = :paysTable AND pays.numRubrique = :libelle AND pays.cleParametre = client.codePays',
        { paysTable: 'PAYS', libelle: '01' },
      );

    if (!query.includeInactive) {
      qb.andWhere('client.actif = :actif', { actif: true });
    }

    if (query.groupes.length > 0 || query.sansGroupe) {
      qb.andWhere(
        new Brackets((groupe) => {
          if (query.groupes.length > 0) {
            groupe.orWhere('client.groupe IN (:...groupes)', {
              groupes: query.groupes,
            });
          }
          if (query.sansGroupe) {
            groupe.orWhere("(client.groupe IS NULL OR client.groupe = '')");
          }
        }),
      );
    }

    // Chaque mot doit être présent ; jokers LIKE neutralisés.
    const terms = (query.search ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, MAX_SEARCH_TERMS);
    terms.forEach((term, index) => {
      qb.andWhere(`${SEARCH_HAYSTACK} LIKE :term${index}`, {
        [`term${index}`]: `%${TypeOrmFilterHelper.escapeLikeValue(term)}%`,
      });
    });

    // Tri demandé, puis identifiant pour un ordre stable entre les pages.
    qb.orderBy(SORT_COLUMNS[query.sortBy], query.sortDirection).addOrderBy(
      'client.id',
      'ASC',
    );

    const [entities, totalItems] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return { items: entities.map(toSummary), totalItems };
  }
}

function toSummary(entity: ClientEntity): ClientSummary {
  return {
    id: entity.id,
    codeClient: entity.codeClient,
    raisonSociale: entity.raisonSociale,
    groupe: entity.groupe || null,
    actif: entity.actif,
    adresse1: entity.adresse1,
    adresse2: entity.adresse2,
    adresse3: entity.adresse3,
    codePostal: entity.codePostal,
    ville: entity.ville,
    codePays: entity.codePays,
  };
}
