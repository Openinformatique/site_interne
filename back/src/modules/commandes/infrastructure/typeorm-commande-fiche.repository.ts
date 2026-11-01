import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  jourMetier,
  sqlUtcText,
  utcTextToDate,
} from '../../../common/utils/sql-date.util';
import { ClientContratEntity } from '../../clients/infrastructure/entities/client-contrat.entity';
import { ClientEntity } from '../../clients/infrastructure/entities/client.entity';
import { ParametreEntity } from '../../parametres/infrastructure/entities/parametre.entity';
import { PointageEntity } from '../../pointages/infrastructure/entities/pointage.entity';
import { UserEntity } from '../../users/infrastructure/entities/user.entity';
import type {
  CommandeDetail,
  CommandeDocument,
  CommandeDocumentFichier,
  CommandeFichePort,
  CommandeInput,
  CommandeTemps,
  NewCommandeDocument,
  PointageCommande,
  TempsPersonne,
} from '../domain/commande-fiche.port';
import { CommandeEntity } from './entities/commande.entity';
import { DocumentCommandeEntity } from './entities/document-commande.entity';

/** Rubrique du libellé d'une valeur de paramètre. */
const RUBRIQUE_LIBELLE = '01';

/** Adaptateur TypeORM du port CommandeFichePort. */
@Injectable()
export class TypeOrmCommandeFicheRepository implements CommandeFichePort {
  constructor(
    @InjectRepository(CommandeEntity)
    private readonly commandes: Repository<CommandeEntity>,
    @InjectRepository(ClientEntity)
    private readonly clients: Repository<ClientEntity>,
    @InjectRepository(ClientContratEntity)
    private readonly contrats: Repository<ClientContratEntity>,
    @InjectRepository(PointageEntity)
    private readonly pointages: Repository<PointageEntity>,
    @InjectRepository(ParametreEntity)
    private readonly parametres: Repository<ParametreEntity>,
    @InjectRepository(DocumentCommandeEntity)
    private readonly documents: Repository<DocumentCommandeEntity>,
  ) {}

  // --- Commande -------------------------------------------------------------

  async findCommande(id: number): Promise<CommandeDetail | null> {
    const result = await this.commandes
      .createQueryBuilder('commande')
      .leftJoin(ClientEntity, 'client', 'client.id = commande.clientId')
      .leftJoin(UserEntity, 'creator', 'creator.id = commande.createdBy')
      .leftJoin(UserEntity, 'updater', 'updater.id = commande.updatedBy')
      .addSelect('client.raisonSociale', 'clientNom')
      .addSelect('client.actif', 'clientActif')
      .addSelect('creator.displayName', 'creatorName')
      .addSelect('updater.displayName', 'updaterName')
      .where('commande.id = :id', { id })
      .getRawAndEntities();
    const entity = result.entities[0];
    if (!entity) {
      return null;
    }
    const raw = result.raw[0] as {
      clientNom: string | null;
      clientActif: boolean | number | null;
      creatorName: string | null;
      updaterName: string | null;
    };
    const pointages = await this.pointages.countBy({ commandeId: id });
    return {
      id: entity.id,
      clientId: entity.clientId,
      client: raw.clientNom,
      clientActif: Boolean(raw.clientActif),
      clientContratId: entity.clientContratId,
      typeCommande: entity.typeCommande ?? '',
      numeroDevis: entity.numeroDevis,
      dateDevis: entity.dateDevis ?? '',
      numeroCommandeClient: entity.numeroCommandeClient,
      dateCommande: entity.dateCommande ?? '',
      libelleCommande: entity.libelleCommande ?? '',
      nbJoursCommande: toNumber(entity.nbJoursCommande) ?? 0,
      nbJoursPrevus: toNumber(entity.nbJoursPrevus) ?? 0,
      delai: entity.delai,
      montant: toNumber(entity.montant),
      dateCloture: entity.dateCloture,
      hasPointages: pointages > 0,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      createdBy: raw.creatorName ?? null,
      updatedBy: raw.updaterName ?? null,
    };
  }

  async createCommande(input: CommandeInput, userId: string): Promise<number> {
    const saved = await this.commandes.save(
      this.commandes.create({
        ...toColumns(input),
        createdBy: userId,
        updatedBy: userId,
      }),
    );
    return saved.id;
  }

  async updateCommande(
    id: number,
    input: CommandeInput,
    userId: string,
  ): Promise<void> {
    await this.commandes.update(
      { id },
      { ...toColumns(input), updatedBy: userId },
    );
  }

  async findClientActif(clientId: number): Promise<boolean | null> {
    const client = await this.clients.findOne({
      select: { id: true, actif: true },
      where: { id: clientId },
    });
    return client ? client.actif : null;
  }

  async contratBelongsToClient(
    contratId: number,
    clientId: number,
  ): Promise<boolean> {
    return this.contrats.existsBy({ id: contratId, clientId });
  }

  async parametreExists(codeTable: string, cle: string): Promise<boolean> {
    return this.parametres.existsBy({
      codeTable,
      cleParametre: cle,
      numRubrique: RUBRIQUE_LIBELLE,
    });
  }

  // --- Temps passé ----------------------------------------------------------

  async temps(
    commandeId: number,
    heuresParJour: number,
  ): Promise<CommandeTemps> {
    const rows = await this.pointages
      .createQueryBuilder('pointage')
      .leftJoin(UserEntity, 'salarie', 'salarie.id = pointage.utilisateurId')
      .leftJoin(
        ParametreEntity,
        'typa',
        'typa.codeTable = :typa AND typa.numRubrique = :rubrique AND typa.cleParametre = pointage.typeAction',
        { typa: 'TYPA', rubrique: RUBRIQUE_LIBELLE },
      )
      .select('pointage.id', 'id')
      .addSelect('pointage.utilisateurId', 'utilisateurId')
      // Instant UTC lu en texte, puis jour à Paris (voir sql-date.util).
      .addSelect(sqlUtcText('pointage.dateHeureDebut'), 'debut')
      .addSelect('salarie.displayName', 'personne')
      .addSelect('pointage.typeAction', 'typeAction')
      .addSelect('typa.zoneParametre', 'typeActionLibelle')
      .addSelect('pointage.description', 'description')
      .addSelect('pointage.tempsFacturable', 'heures')
      .where('pointage.commandeId = :commandeId', { commandeId })
      .orderBy('pointage.dateHeureDebut', 'DESC')
      .addOrderBy('pointage.id', 'DESC')
      .getRawMany<RawPointage>();

    const pointages: PointageCommande[] = [];
    // Cumul par personne ; lignes triées par date décroissante, donc le
    // premier pointage rencontré d'une personne est son dernier.
    // Cumul en heures (arrondi en jours à la fin, pas pointage par pointage).
    const parPersonne = new Map<string, TempsPersonne & { heures: number }>();
    for (const row of rows) {
      const pointage: PointageCommande = {
        id: row.id,
        date: row.debut ? jourMetier(utcTextToDate(row.debut)) : null,
        personne: row.personne,
        typeAction: row.typeAction || null,
        typeActionLibelle: row.typeActionLibelle || row.typeAction || null,
        description: row.description,
        jours: round4(Number(row.heures ?? 0) / heuresParJour),
      };
      pointages.push(pointage);
      const key = row.utilisateurId ?? '';
      const heures = Number(row.heures ?? 0);
      const cumul = parPersonne.get(key);
      if (cumul) {
        cumul.heures += heures;
      } else {
        parPersonne.set(key, {
          utilisateurId: row.utilisateurId,
          personne: row.personne,
          jours: 0,
          heures,
          dernierPointage: pointage.date,
        });
      }
    }
    const personnes = [...parPersonne.values()]
      .map(({ heures, ...personne }) => ({
        ...personne,
        jours: round4(heures / heuresParJour),
      }))
      .sort((a, b) => b.jours - a.jours);

    return { personnes, pointages };
  }

  // --- Documents ------------------------------------------------------------

  async listDocuments(commandeId: number): Promise<CommandeDocument[]> {
    const rows = await this.documents
      .createQueryBuilder('document')
      .leftJoin(
        ParametreEntity,
        'tdoc',
        'tdoc.codeTable = :tdoc AND tdoc.numRubrique = :rubrique AND tdoc.cleParametre = document.typeDocument',
        { tdoc: 'TDOC', rubrique: RUBRIQUE_LIBELLE },
      )
      .select('document.id', 'id')
      .addSelect('document.nomFichier', 'nomFichier')
      .addSelect('document.typeDocument', 'typeDocument')
      .addSelect('tdoc.zoneParametre', 'typeDocumentLibelle')
      .addSelect('document.commentaire', 'commentaire')
      .addSelect('document.typeMime', 'typeMime')
      .addSelect('document.tailleOctets', 'tailleOctets')
      .addSelect('document.createdAt', 'createdAt')
      .where('document.commandeId = :commandeId', { commandeId })
      .orderBy('document.createdAt', 'DESC')
      .addOrderBy('document.id', 'DESC')
      .getRawMany<RawDocument>();
    return rows.map((row) => ({
      id: row.id,
      nomFichier: row.nomFichier,
      typeDocument: row.typeDocument,
      typeDocumentLibelle: row.typeDocumentLibelle || row.typeDocument,
      commentaire: row.commentaire,
      typeMime: row.typeMime,
      tailleOctets: Number(row.tailleOctets),
      createdAt: row.createdAt,
    }));
  }

  async findDocumentFichier(
    commandeId: number,
    documentId: number,
  ): Promise<CommandeDocumentFichier | null> {
    const document = await this.documents.findOneBy({
      id: documentId,
      commandeId,
    });
    return document
      ? {
          id: document.id,
          nomFichier: document.nomFichier,
          typeMime: document.typeMime,
          fichierIdentifiant: document.fichierIdentifiant,
        }
      : null;
  }

  async addDocument(
    document: NewCommandeDocument,
    userId: string,
  ): Promise<number> {
    const saved = await this.documents.save(
      this.documents.create({
        commandeId: document.commandeId,
        typeDocument: document.typeDocument,
        commentaire: document.commentaire,
        nomFichier: document.nomFichier,
        typeMime: document.typeMime,
        tailleOctets: String(document.tailleOctets),
        fichierIdentifiant: document.fichierIdentifiant,
        createdBy: userId,
        updatedBy: userId,
      }),
    );
    return saved.id;
  }

  async deleteDocument(documentId: number): Promise<void> {
    await this.documents.delete({ id: documentId });
  }
}

interface RawPointage {
  id: number;
  utilisateurId: string | null;
  debut: string | null;
  personne: string | null;
  typeAction: string | null;
  typeActionLibelle: string | null;
  description: string | null;
  heures: string | number | null;
}

interface RawDocument {
  id: number;
  nomFichier: string | null;
  typeDocument: string | null;
  typeDocumentLibelle: string | null;
  commentaire: string | null;
  typeMime: string;
  tailleOctets: string | number;
  createdAt: Date;
}

/** Champs saisis → colonnes (décimaux en chaîne pour le driver mssql). */
function toColumns(input: CommandeInput): Partial<CommandeEntity> {
  return {
    clientId: input.clientId,
    clientContratId: input.clientContratId,
    typeCommande: input.typeCommande,
    numeroDevis: input.numeroDevis,
    dateDevis: input.dateDevis,
    numeroCommandeClient: input.numeroCommandeClient,
    dateCommande: input.dateCommande,
    libelleCommande: input.libelleCommande,
    nbJoursCommande: String(input.nbJoursCommande),
    nbJoursPrevus: String(input.nbJoursPrevus),
    delai: input.delai,
    montant: input.montant === null ? null : String(input.montant),
    dateCloture: input.dateCloture,
  };
}

function toNumber(value: string | number | null): number | null {
  return value === null ? null : Number(value);
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
