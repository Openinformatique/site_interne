import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientContratEntity } from '../clients/infrastructure/entities/client-contrat.entity';
import { ClientEntity } from '../clients/infrastructure/entities/client.entity';
import { CommandeEntity } from '../commandes/infrastructure/entities/commande.entity';
import { ParametreEntity } from '../parametres/infrastructure/entities/parametre.entity';
import { PointageEntity } from '../pointages/infrastructure/entities/pointage.entity';
import { UserEntity } from '../users/infrastructure/entities/user.entity';
import { TableauDeBordUseCase } from './application/tableau-de-bord.use-case';
import { TABLEAU_DE_BORD } from './domain/tableau-de-bord.port';
import { TypeOrmTableauDeBordRepository } from './infrastructure/typeorm-tableau-de-bord.repository';
import { TableauDeBordController } from './presentation/tableau-de-bord.controller';

/**
 * Module tableau de bord (voir README.md) : contrats à renouveler, commandes
 * à livrer et congés des 15 prochains jours.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClientEntity,
      ClientContratEntity,
      CommandeEntity,
      PointageEntity,
      ParametreEntity,
      UserEntity,
    ]),
  ],
  controllers: [TableauDeBordController],
  providers: [
    TableauDeBordUseCase,
    { provide: TABLEAU_DE_BORD, useClass: TypeOrmTableauDeBordRepository },
  ],
})
export class TableauDeBordModule {}
