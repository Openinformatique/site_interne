import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientContratEntity } from '../clients/infrastructure/entities/client-contrat.entity';
import { ClientEntity } from '../clients/infrastructure/entities/client.entity';
import { CommandeEntity } from '../commandes/infrastructure/entities/commande.entity';
import { PointageEntity } from '../pointages/infrastructure/entities/pointage.entity';
import { RechercheUseCase } from './application/recherche.use-case';
import { RECHERCHE } from './domain/recherche.port';
import { TypeOrmRechercheRepository } from './infrastructure/typeorm-recherche.repository';
import { RechercheController } from './presentation/recherche.controller';

/** Module recherche (voir README.md) : recherche globale de la barre du haut. */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClientEntity,
      ClientContratEntity,
      CommandeEntity,
      PointageEntity,
    ]),
  ],
  controllers: [RechercheController],
  providers: [
    RechercheUseCase,
    { provide: RECHERCHE, useClass: TypeOrmRechercheRepository },
  ],
})
export class RechercheModule {}
