import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientContratEntity } from '../clients/infrastructure/entities/client-contrat.entity';
import { ClientEntity } from '../clients/infrastructure/entities/client.entity';
import { ParametreEntity } from '../parametres/infrastructure/entities/parametre.entity';
import { PointageEntity } from '../pointages/infrastructure/entities/pointage.entity';
import { CommandeDocumentsUseCase } from './application/commande-documents.use-case';
import { CommandeFicheUseCase } from './application/commande-fiche.use-case';
import { ListCommandesUseCase } from './application/list-commandes.use-case';
import { COMMANDE_FICHE } from './domain/commande-fiche.port';
import {
  COMMANDE_LIST,
  COMMANDES_SPREADSHEET,
} from './domain/commande-list.port';
import { CommandeEntity } from './infrastructure/entities/commande.entity';
import { DocumentCommandeEntity } from './infrastructure/entities/document-commande.entity';
import { ExcelJsCommandesSpreadsheet } from './infrastructure/exceljs-commandes.spreadsheet';
import { TypeOrmCommandeFicheRepository } from './infrastructure/typeorm-commande-fiche.repository';
import { TypeOrmCommandeListRepository } from './infrastructure/typeorm-commande-list.repository';
import { CommandeFicheController } from './presentation/commande-fiche.controller';
import { CommandesController } from './presentation/commandes.controller';
import { StorageModule } from '../storage/storage.module';

/**
 * Module commandes (voir README.md) : liste des commandes (filtre client,
 * export Excel) et fiche commande (saisie, temps passé, documents).
 */
@Module({
  imports: [
    StorageModule,
    TypeOrmModule.forFeature([
      CommandeEntity,
      DocumentCommandeEntity,
      ClientEntity,
      ClientContratEntity,
      PointageEntity,
      ParametreEntity,
    ]),
  ],
  // Ordre significatif : /commandes/clients et /commandes/export avant /commandes/:id.
  controllers: [CommandesController, CommandeFicheController],
  providers: [
    ListCommandesUseCase,
    CommandeFicheUseCase,
    CommandeDocumentsUseCase,
    { provide: COMMANDE_FICHE, useClass: TypeOrmCommandeFicheRepository },
    { provide: COMMANDE_LIST, useClass: TypeOrmCommandeListRepository },
    { provide: COMMANDES_SPREADSHEET, useClass: ExcelJsCommandesSpreadsheet },
  ],
})
export class CommandesModule {}
