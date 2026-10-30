import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientContratEntity } from '../clients/infrastructure/entities/client-contrat.entity';
import { ClientEntity } from '../clients/infrastructure/entities/client.entity';
import { ParametreEntity } from '../parametres/infrastructure/entities/parametre.entity';
import { PointageEntity } from '../pointages/infrastructure/entities/pointage.entity';
import { ListCommandesUseCase } from './application/list-commandes.use-case';
import {
  COMMANDE_LIST,
  COMMANDES_SPREADSHEET,
} from './domain/commande-list.port';
import { CommandeEntity } from './infrastructure/entities/commande.entity';
import { ExcelJsCommandesSpreadsheet } from './infrastructure/exceljs-commandes.spreadsheet';
import { TypeOrmCommandeListRepository } from './infrastructure/typeorm-commande-list.repository';
import { CommandesController } from './presentation/commandes.controller';

/**
 * Module commandes (voir README.md) : liste des commandes, filtre client et
 * export Excel.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommandeEntity,
      ClientEntity,
      ClientContratEntity,
      PointageEntity,
      ParametreEntity,
    ]),
  ],
  controllers: [CommandesController],
  providers: [
    ListCommandesUseCase,
    { provide: COMMANDE_LIST, useClass: TypeOrmCommandeListRepository },
    { provide: COMMANDES_SPREADSHEET, useClass: ExcelJsCommandesSpreadsheet },
  ],
})
export class CommandesModule {}
