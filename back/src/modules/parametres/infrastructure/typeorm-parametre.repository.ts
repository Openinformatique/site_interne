import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type {
  ParametreRepositoryPort,
  ParametreValue,
} from '../domain/parametre-repository.port';
import { ParametreEntity } from './entities/parametre.entity';

/** Rubrique portant le libellé d'une clé de paramètre. */
const RUBRIQUE_LIBELLE = '01';

/** Adaptateur TypeORM du port ParametreRepositoryPort. */
@Injectable()
export class TypeOrmParametreRepository implements ParametreRepositoryPort {
  constructor(
    @InjectRepository(ParametreEntity)
    private readonly repository: Repository<ParametreEntity>,
  ) {}

  async findValues(codeTable: string): Promise<ParametreValue[]> {
    const entities = await this.repository.find({
      where: { codeTable, numRubrique: RUBRIQUE_LIBELLE, actif: true },
      order: { zoneParametre: 'ASC' },
    });
    return entities.map((entity) => ({
      cle: entity.cleParametre,
      libelle: entity.zoneParametre,
    }));
  }
}
