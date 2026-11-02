import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientEntity } from '../clients/infrastructure/entities/client.entity';
import { ContactEntity } from '../clients/infrastructure/entities/contact.entity';
import { CommandeEntity } from '../commandes/infrastructure/entities/commande.entity';
import { ParametreEntity } from '../parametres/infrastructure/entities/parametre.entity';
import { UserEntity } from '../users/infrastructure/entities/user.entity';
import { PdfModule } from '../pdf/pdf.module';
import { PointagesUseCase } from './application/pointages.use-case';
import { ReleveMensuelUseCase } from './application/releve-mensuel.use-case';
import { RELEVE_SPREADSHEET } from './domain/releve-mensuel';
import { ExcelJsReleveSpreadsheet } from './infrastructure/exceljs-releve.spreadsheet';
import { POINTAGES } from './domain/pointage.port';
import { PointageEntity } from './infrastructure/entities/pointage.entity';
import { TypeOrmPointageRepository } from './infrastructure/typeorm-pointage.repository';
import { PointagesController } from './presentation/pointages.controller';
import { ExportCflUseCase } from './application/export-cfl.use-case';
import { EXPORT_CFL } from './domain/export-cfl';
import { TypeOrmExportCflRepository } from './infrastructure/typeorm-export-cfl.repository';
import { ExportCflController } from './presentation/export-cfl.controller';

/** Module pointages (voir README.md) : planning hebdomadaire, saisie des pointages et relevé mensuel. */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      PointageEntity,
      ParametreEntity,
      UserEntity,
      ClientEntity,
      ContactEntity,
      CommandeEntity,
    ]),
    PdfModule,
  ],
  controllers: [PointagesController, ExportCflController],
  providers: [
    PointagesUseCase,
    ReleveMensuelUseCase,
    { provide: RELEVE_SPREADSHEET, useClass: ExcelJsReleveSpreadsheet },
    { provide: POINTAGES, useClass: TypeOrmPointageRepository },
    ExportCflUseCase,
    { provide: EXPORT_CFL, useClass: TypeOrmExportCflRepository },
  ],
})
export class PointagesModule {}
