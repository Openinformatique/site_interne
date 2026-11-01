import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListParametreValuesUseCase } from './application/list-parametre-values.use-case';
import { ParametresAdminUseCase } from './application/parametres-admin.use-case';
import { PARAMETRE_ADMIN } from './domain/parametre-admin.port';
import { PARAMETRE_REPOSITORY } from './domain/parametre-repository.port';
import { ParametreIntegriteEntity } from './infrastructure/entities/parametre-integrite.entity';
import { ParametreRubriqueEntity } from './infrastructure/entities/parametre-rubrique.entity';
import { ParametreTableEntity } from './infrastructure/entities/parametre-table.entity';
import { ParametreEntity } from './infrastructure/entities/parametre.entity';
import { TypeOrmParametreAdminRepository } from './infrastructure/typeorm-parametre-admin.repository';
import { TypeOrmParametreRepository } from './infrastructure/typeorm-parametre.repository';
import { ParametresAdminController } from './presentation/parametres-admin.controller';
import { ParametresController } from './presentation/parametres.controller';

/**
 * Module du paramétrage générique (voir docs/schema-metier.md).
 *
 * Expose la lecture des valeurs d'une table (GET /parametres/:codeTable) et
 * l'administration des tables, rubriques et paramètres (écran Paramètres,
 * /parametres/admin/tables, rôles ADMIN et DIRECTION).
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
  controllers: [ParametresAdminController, ParametresController],
  providers: [
    ListParametreValuesUseCase,
    ParametresAdminUseCase,
    { provide: PARAMETRE_ADMIN, useClass: TypeOrmParametreAdminRepository },
    { provide: PARAMETRE_REPOSITORY, useClass: TypeOrmParametreRepository },
  ],
})
export class ParametresModule {}
