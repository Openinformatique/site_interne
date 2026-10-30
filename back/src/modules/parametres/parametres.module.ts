import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListParametreValuesUseCase } from './application/list-parametre-values.use-case';
import { PARAMETRE_REPOSITORY } from './domain/parametre-repository.port';
import { ParametreIntegriteEntity } from './infrastructure/entities/parametre-integrite.entity';
import { ParametreRubriqueEntity } from './infrastructure/entities/parametre-rubrique.entity';
import { ParametreTableEntity } from './infrastructure/entities/parametre-table.entity';
import { ParametreEntity } from './infrastructure/entities/parametre.entity';
import { TypeOrmParametreRepository } from './infrastructure/typeorm-parametre.repository';
import { ParametresController } from './presentation/parametres.controller';

/**
 * Module du paramétrage générique (voir docs/schema-metier.md).
 *
 * Expose la lecture des valeurs d'une table (GET /parametres/:codeTable).
 * Les entités sont enregistrées ici : les autres modules qui joignent le
 * paramétrage (ex. libellé du pays d'un client) s'appuient sur leurs
 * métadonnées.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ParametreTableEntity,
      ParametreRubriqueEntity,
      ParametreEntity,
      ParametreIntegriteEntity,
    ]),
  ],
  controllers: [ParametresController],
  providers: [
    ListParametreValuesUseCase,
    { provide: PARAMETRE_REPOSITORY, useClass: TypeOrmParametreRepository },
  ],
})
export class ParametresModule {}
