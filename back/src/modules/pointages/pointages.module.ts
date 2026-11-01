import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientEntity } from '../clients/infrastructure/entities/client.entity';
import { ContactEntity } from '../clients/infrastructure/entities/contact.entity';
import { CommandeEntity } from '../commandes/infrastructure/entities/commande.entity';
import { ParametreEntity } from '../parametres/infrastructure/entities/parametre.entity';
import { UserEntity } from '../users/infrastructure/entities/user.entity';
import { PointagesUseCase } from './application/pointages.use-case';
import { POINTAGES } from './domain/pointage.port';
import { PointageEntity } from './infrastructure/entities/pointage.entity';
import { TypeOrmPointageRepository } from './infrastructure/typeorm-pointage.repository';
import { PointagesController } from './presentation/pointages.controller';

/** Module pointages (voir README.md) : planning hebdomadaire et saisie des pointages. */
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
  ],
  controllers: [PointagesController],
  providers: [
    PointagesUseCase,
    { provide: POINTAGES, useClass: TypeOrmPointageRepository },
  ],
})
export class PointagesModule {}
