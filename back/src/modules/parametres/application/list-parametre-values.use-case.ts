import { Inject, Injectable } from '@nestjs/common';
import { PARAMETRE_REPOSITORY } from '../domain/parametre-repository.port';
import type {
  ParametreRepositoryPort,
  ParametreValue,
} from '../domain/parametre-repository.port';

/**
 * Cas d'utilisation : valeurs d'une table de paramètres (ex. GSOC pour les
 * groupes sociétaux, PAYS pour les pays), utilisées par les listes
 * déroulantes et pour afficher le libellé d'une clé.
 */
@Injectable()
export class ListParametreValuesUseCase {
  constructor(
    @Inject(PARAMETRE_REPOSITORY)
    private readonly parametreRepository: ParametreRepositoryPort,
  ) {}

  execute(codeTable: string): Promise<ParametreValue[]> {
    return this.parametreRepository.findValues(codeTable.toUpperCase());
  }
}
