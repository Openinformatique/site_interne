import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import {
  dateToUtcText,
  sqlUtcText,
  utcTextToDate,
} from '../../../common/utils/sql-date.util';
import { ClientEntity } from '../../clients/infrastructure/entities/client.entity';
import { ContactEntity } from '../../clients/infrastructure/entities/contact.entity';
import { CommandeEntity } from '../../commandes/infrastructure/entities/commande.entity';
import { ParametreEntity } from '../../parametres/infrastructure/entities/parametre.entity';
import { UserEntity } from '../../users/infrastructure/entities/user.entity';
import type {
  ClientOption,
  CommandeOption,
  CommandeRef,
  ContactOption,
  PersonneOption,
  Pointage,
  PointageInput,
  PointagePort,
  TypeAction,
} from '../domain/pointage.port';
import { PointageEntity } from './entities/pointage.entity';

/** Rubriques des paramètres : libellé, puis couleur du planning (TYPA). */
const RUBRIQUE_LIBELLE = '01';
const RUBRIQUE_COULEUR = '02';

/**
 * Adaptateur TypeORM du port PointagePort.
 *
 * Les colonnes datetime2 contiennent des instants UTC (reprise comprise) :
 * le driver mssql les lit et les écrit en UTC, le front les affiche en heure
 * locale.
 */
@Injectable()
export class TypeOrmPointageRepository implements PointagePort {
  constructor(
    @InjectRepository(PointageEntity)
    private readonly pointages: Repository<PointageEntity>,
    @InjectRepository(ParametreEntity)
    private readonly parametres: Repository<ParametreEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(ClientEntity)
    private readonly clientsRepo: Repository<ClientEntity>,
    @InjectRepository(ContactEntity)
    private readonly contactsRepo: Repository<ContactEntity>,
    @InjectRepository(CommandeEntity)
    private readonly commandesRepo: Repository<CommandeEntity>,
  ) {}

  // --- Pointages ------------------------------------------------------------

  async list(utilisateurId: string, du: Date, au: Date): Promise<Pointage[]> {
    const rows = await this.selectPointages()
      .where('pointage.utilisateurId = :utilisateurId', { utilisateurId })
      .andWhere('pointage.dateHeureDebut < CAST(:au AS datetime2)', {
        au: dateToUtcText(au),
      })
      .andWhere('pointage.dateHeureFin > CAST(:du AS datetime2)', {
        du: dateToUtcText(du),
      })
      .orderBy('pointage.dateHeureDebut', 'ASC')
      .addOrderBy('pointage.id', 'ASC')
      .getRawMany<RawPointage>();
    return rows.map(toPointage);
  }

  async find(id: number): Promise<Pointage | null> {
    const row = await this.selectPointages()
      .where('pointage.id = :id', { id })
      .getRawOne<RawPointage>();
    return row ? toPointage(row) : null;
  }

  async create(input: PointageInput, userId: string): Promise<number> {
    const result = await this.pointages
      .createQueryBuilder()
      .insert()
      .into(PointageEntity)
      .values({ ...toColumns(input), createdBy: userId, updatedBy: userId })
      .setParameters(instantsUtc(input))
      .execute();
    return (result.identifiers[0] as { id: number }).id;
  }

  async createMany(
    inputs: readonly PointageInput[],
    userId: string,
  ): Promise<number> {
    await this.pointages.manager.transaction(async (manager) => {
      for (const input of inputs) {
        await manager
          .createQueryBuilder()
          .insert()
          .into(PointageEntity)
          .values({ ...toColumns(input), createdBy: userId, updatedBy: userId })
          .setParameters(instantsUtc(input))
          .execute();
      }
    });
    return inputs.length;
  }

  async update(
    id: number,
    input: PointageInput,
    userId: string,
  ): Promise<void> {
    await this.pointages
      .createQueryBuilder()
      .update(PointageEntity)
      .set({ ...toColumns(input), updatedBy: userId })
      .setParameters(instantsUtc(input))
      .where('id = :id', { id })
      .execute();
  }

  async delete(id: number): Promise<void> {
    await this.pointages.delete({ id });
  }

  // --- Référentiels ---------------------------------------------------------

  async typesAction(): Promise<TypeAction[]> {
    const rows = await this.parametres
      .createQueryBuilder('libelle')
      .leftJoin(
        ParametreEntity,
        'couleur',
        'couleur.codeTable = libelle.codeTable AND couleur.cleParametre = libelle.cleParametre AND couleur.numRubrique = :rubriqueCouleur',
        { rubriqueCouleur: RUBRIQUE_COULEUR },
      )
      .select('libelle.cleParametre', 'cle')
      .addSelect('libelle.zoneParametre', 'libelle')
      .addSelect('couleur.zoneParametre', 'couleur')
      .where('libelle.codeTable = :table', { table: 'TYPA' })
      .andWhere('libelle.numRubrique = :rubrique', {
        rubrique: RUBRIQUE_LIBELLE,
      })
      .andWhere('libelle.actif = 1')
      .orderBy('libelle.zoneParametre', 'ASC')
      .getRawMany<{ cle: string; libelle: string; couleur: string | null }>();
    return rows.map((row) => ({
      cle: row.cle,
      libelle: row.libelle || row.cle,
      couleur: row.couleur?.trim() || null,
    }));
  }

  async tags(): Promise<string[]> {
    const rows = await this.parametres.find({
      select: { zoneParametre: true },
      where: { codeTable: 'TAGS', numRubrique: RUBRIQUE_LIBELLE, actif: true },
      order: { zoneParametre: 'ASC' },
    });
    return rows.map((row) => row.zoneParametre.trim()).filter(Boolean);
  }

  async personnes(): Promise<PersonneOption[]> {
    const rows = await this.users.find({
      select: { id: true, displayName: true },
      where: { isActive: true },
      order: { displayName: 'ASC' },
    });
    return rows.map((row) => ({ id: row.id, nom: row.displayName }));
  }

  async nomPersonne(id: string): Promise<string | null> {
    const user = await this.users.findOne({
      select: { id: true, displayName: true },
      where: { id },
    });
    return user?.displayName ?? null;
  }

  async clients(): Promise<ClientOption[]> {
    const rows = await this.clientsRepo.find({
      select: { id: true, codeClient: true, raisonSociale: true },
      where: { actif: true },
      order: { raisonSociale: 'ASC', id: 'ASC' },
    });
    return rows.map((row) => ({
      id: row.id,
      code: row.codeClient,
      nom: row.raisonSociale,
    }));
  }

  async contacts(clientId: number): Promise<ContactOption[]> {
    const rows = await this.contactsRepo.find({
      select: { id: true, nomContact: true, actif: true },
      where: { clientId },
      order: { nomContact: 'ASC', id: 'ASC' },
    });
    return rows.map((row) => ({
      id: row.id,
      nom: row.nomContact,
      actif: row.actif,
    }));
  }

  async commandes(clientId: number): Promise<CommandeOption[]> {
    const rows = await this.commandesRepo.find({
      select: {
        id: true,
        numeroCommandeClient: true,
        numeroDevis: true,
        libelleCommande: true,
        clientContratId: true,
        dateCloture: true,
      },
      where: { clientId },
      order: { id: 'DESC' },
    });
    return rows.map((row) => ({
      id: row.id,
      numero: row.numeroCommandeClient || row.numeroDevis || null,
      libelle: row.libelleCommande,
      contrat: row.clientContratId !== null,
      cloturee: row.dateCloture !== null,
    }));
  }

  // --- Contrôles des règles de saisie ---------------------------------------

  userExists(id: string): Promise<boolean> {
    return this.users.existsBy({ id });
  }

  clientExists(id: number): Promise<boolean> {
    return this.clientsRepo.existsBy({ id });
  }

  async findCommande(id: number): Promise<CommandeRef | null> {
    const commande = await this.commandesRepo.findOne({
      select: { id: true, clientId: true, clientContratId: true },
      where: { id },
    });
    return commande
      ? {
          clientId: commande.clientId,
          contrat: commande.clientContratId !== null,
        }
      : null;
  }

  async contactClient(id: number): Promise<number | null> {
    const contact = await this.contactsRepo.findOne({
      select: { id: true, clientId: true },
      where: { id },
    });
    return contact?.clientId ?? null;
  }

  typeActionExists(cle: string): Promise<boolean> {
    return this.parametres.existsBy({
      codeTable: 'TYPA',
      cleParametre: cle,
      numRubrique: RUBRIQUE_LIBELLE,
    });
  }

  private selectPointages(): SelectQueryBuilder<PointageEntity> {
    return (
      this.pointages
        .createQueryBuilder('pointage')
        .leftJoin(ClientEntity, 'client', 'client.id = pointage.clientId')
        .leftJoin(
          CommandeEntity,
          'commande',
          'commande.id = pointage.commandeId',
        )
        .leftJoin(ContactEntity, 'contact', 'contact.id = pointage.contactId')
        .select('pointage.id', 'id')
        .addSelect('pointage.utilisateurId', 'utilisateurId')
        // Instants UTC lus en texte (voir sql-date.util).
        .addSelect(sqlUtcText('pointage.dateHeureDebut'), 'debut')
        .addSelect(sqlUtcText('pointage.dateHeureFin'), 'fin')
        .addSelect('pointage.typeAction', 'typeAction')
        .addSelect('pointage.clientId', 'clientId')
        .addSelect('client.codeClient', 'clientCode')
        .addSelect('client.raisonSociale', 'clientNom')
        .addSelect('pointage.commandeId', 'commandeId')
        .addSelect(
          'COALESCE(commande.numeroCommandeClient, commande.numeroDevis)',
          'commandeNumero',
        )
        .addSelect('pointage.contactId', 'contactId')
        .addSelect('contact.nomContact', 'contactNom')
        .addSelect('pointage.description', 'description')
        .addSelect('pointage.facturable', 'facturable')
        .addSelect('pointage.tempsFacturable', 'tempsFacturable')
    );
  }
}

interface RawPointage {
  id: number;
  utilisateurId: string | null;
  debut: string;
  fin: string;
  typeAction: string | null;
  clientId: number | null;
  clientCode: string | null;
  clientNom: string | null;
  commandeId: number | null;
  commandeNumero: string | null;
  contactId: number | null;
  contactNom: string | null;
  description: string | null;
  facturable: number;
  tempsFacturable: string | number | null;
}

function toPointage(row: RawPointage): Pointage {
  return {
    id: row.id,
    utilisateurId: row.utilisateurId ?? '',
    debut: utcTextToDate(row.debut),
    fin: utcTextToDate(row.fin),
    typeAction: row.typeAction ?? '',
    clientId: row.clientId,
    clientCode: row.clientCode?.trim() || null,
    clientNom: row.clientNom?.trim() || null,
    commandeId: row.commandeId,
    commandeNumero: row.commandeNumero?.trim() || null,
    contactId: row.contactId,
    contactNom: row.contactNom?.trim() || null,
    description: row.description,
    facturable: Number(row.facturable),
    tempsFacturable:
      row.tempsFacturable === null ? null : Number(row.tempsFacturable),
  };
}

/** Début et fin écrits en texte UTC explicite (voir sql-date.util). */
function instantsUtc(input: PointageInput): { debut: string; fin: string } {
  return { debut: dateToUtcText(input.debut), fin: dateToUtcText(input.fin) };
}

function toColumns(
  input: PointageInput,
): QueryDeepPartialEntity<PointageEntity> {
  return {
    utilisateurId: input.utilisateurId,
    dateHeureDebut: () => 'CAST(:debut AS datetime2)',
    dateHeureFin: () => 'CAST(:fin AS datetime2)',
    typeAction: input.typeAction,
    clientId: input.clientId,
    commandeId: input.commandeId,
    contactId: input.contactId,
    description: input.description,
    facturable: input.facturable,
    tempsFacturable:
      input.tempsFacturable === null ? null : input.tempsFacturable.toFixed(4),
  };
}
