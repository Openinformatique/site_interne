import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommandeEntity } from '../commandes/infrastructure/entities/commande.entity';
import { ParametreEntity } from '../parametres/infrastructure/entities/parametre.entity';
import { PointageEntity } from '../pointages/infrastructure/entities/pointage.entity';
import { ClientFicheUseCase } from './application/client-fiche.use-case';
import { ClientRelationsUseCase } from './application/client-relations.use-case';
import { ListClientsUseCase } from './application/list-clients.use-case';
import { CLIENT_FICHE } from './domain/client-fiche.port';
import { CLIENT_REPOSITORY } from './domain/client-repository.port';
import { ClientContratEntity } from './infrastructure/entities/client-contrat.entity';
import { ClientEntity } from './infrastructure/entities/client.entity';
import { ContactEntity } from './infrastructure/entities/contact.entity';
import { TypeOrmClientFicheRepository } from './infrastructure/typeorm-client-fiche.repository';
import { TypeOrmClientRepository } from './infrastructure/typeorm-client.repository';
import { ClientsController } from './presentation/clients.controller';

/**
 * Module clients (voir README.md) : liste des clients et fiche client
 * (client, contrats avec suivi, contacts, commandes du client).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClientEntity,
      ClientContratEntity,
      ContactEntity,
      CommandeEntity,
      PointageEntity,
      ParametreEntity,
    ]),
  ],
  controllers: [ClientsController],
  providers: [
    ListClientsUseCase,
    ClientFicheUseCase,
    ClientRelationsUseCase,
    { provide: CLIENT_REPOSITORY, useClass: TypeOrmClientRepository },
    { provide: CLIENT_FICHE, useClass: TypeOrmClientFicheRepository },
  ],
})
export class ClientsModule {}
