import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  dateToUtcText,
  jourMetier,
  sqlUtcText,
  utcTextToDate,
} from '../../../common/utils/sql-date.util';
import { ClientEntity } from '../../clients/infrastructure/entities/client.entity';
import { ContactEntity } from '../../clients/infrastructure/entities/contact.entity';
import { CommandeEntity } from '../../commandes/infrastructure/entities/commande.entity';
import { UserEntity } from '../../users/infrastructure/entities/user.entity';
import type { ExportCflPointage, ExportCflPort } from '../domain/export-cfl';
import { PointageEntity } from './entities/pointage.entity';

/** Adaptateur TypeORM de l'« Export (format CFL) ». */
@Injectable()
export class TypeOrmExportCflRepository implements ExportCflPort {
  constructor(
    @InjectRepository(PointageEntity)
    private readonly pointagesRepo: Repository<PointageEntity>,
    @InjectRepository(ClientEntity)
    private readonly clients: Repository<ClientEntity>,
    @InjectRepository(CommandeEntity)
    private readonly commandes: Repository<CommandeEntity>,
  ) {}

  async nomClient(clientId: number): Promise<string | null> {
    const client = await this.clients.findOneBy({ id: clientId });
    if (!client) {
      return null;
    }
    return client.raisonSociale?.trim() || client.codeClient?.trim() || '';
  }

  async libelleCommande(
    clientId: number,
    commandeId: number,
  ): Promise<string | null> {
    const commande = await this.commandes.findOneBy({
      id: commandeId,
      clientId,
    });
    if (!commande) {
      return null;
    }
    return [
      commande.numeroCommandeClient ?? commande.numeroDevis,
      commande.libelleCommande?.trim(),
    ]
      .filter(Boolean)
      .join(' — ');
  }

  async pointages(
    clientId: number,
    depuis: Date,
    jusqua: Date,
  ): Promise<ExportCflPointage[]> {
    const rows = await this.pointagesRepo
      .createQueryBuilder('pointage')
      .leftJoin(UserEntity, 'salarie', 'salarie.id = pointage.utilisateurId')
      .leftJoin(ContactEntity, 'contact', 'contact.id = pointage.contactId')
      .select(sqlUtcText('pointage.dateHeureDebut'), 'debut')
      .addSelect(sqlUtcText('pointage.dateHeureFin'), 'fin')
      .addSelect('pointage.utilisateurId', 'utilisateurId')
      .addSelect('salarie.displayName', 'salarie')
      .addSelect('contact.nomContact', 'contact')
      .addSelect('pointage.commandeId', 'commandeId')
      .addSelect('pointage.typeAction', 'typeAction')
      .addSelect('pointage.description', 'description')
      .where('pointage.clientId = :clientId', { clientId })
      // Instants UTC écrits en texte explicite (voir sql-date.util).
      .andWhere('pointage.dateHeureDebut >= CAST(:depuis AS datetime2)', {
        depuis: dateToUtcText(depuis),
      })
      .andWhere('pointage.dateHeureDebut < CAST(:jusqua AS datetime2)', {
        jusqua: dateToUtcText(jusqua),
      })
      .andWhere('pointage.dateHeureFin IS NOT NULL')
      .getRawMany<{
        debut: string;
        fin: string;
        utilisateurId: string | null;
        salarie: string | null;
        contact: string | null;
        commandeId: number | null;
        typeAction: string | null;
        description: string | null;
      }>();
    return rows.map((row) => {
      const debut = utcTextToDate(row.debut);
      return {
        debut,
        fin: utcTextToDate(row.fin),
        jour: jourMetier(debut),
        utilisateurId: row.utilisateurId,
        salarie: row.salarie?.trim() ?? '',
        contact: row.contact,
        commandeId: row.commandeId === null ? null : Number(row.commandeId),
        typeAction: row.typeAction?.trim() || null,
        description: row.description,
      };
    });
  }
}
