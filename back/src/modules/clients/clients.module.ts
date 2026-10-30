import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListClientsUseCase } from './application/list-clients.use-case';
import { CLIENT_REPOSITORY } from './domain/client-repository.port';
import { ClientContratEntity } from './infrastructure/entities/client-contrat.entity';
import { ClientEntity } from './infrastructure/entities/client.entity';
import { ContactEntity } from './infrastructure/entities/contact.entity';
import { TypeOrmClientRepository } from './infrastructure/typeorm-client.repository';
import { ClientsController } from './presentation/clients.controller';

/**
 * Module clients (voir README.md) : liste des clients pour l'instant ;
 * la fiche client (consultation / création / modification) viendra ensuite.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClientEntity,
      ClientContratEntity,
      ContactEntity,
    ]),
  ],
  controllers: [ClientsController],
  providers: [
    ListClientsUseCase,
    { provide: CLIENT_REPOSITORY, useClass: TypeOrmClientRepository },
  ],
})
export class ClientsModule {}
