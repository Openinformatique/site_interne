import { Inject, Injectable } from '@nestjs/common';
import {
  ResourceNotFoundException,
  ValidationException,
} from '../../../common/exceptions/app-exceptions';
import { COMMANDE_FICHE } from '../domain/commande-fiche.port';
import type {
  CommandeDetail,
  CommandeFichePort,
  CommandeInput,
  CommandeTemps,
} from '../domain/commande-fiche.port';
import { COMMANDE_LIST } from '../domain/commande-list.port';
import type { CommandeListPort } from '../domain/commande-list.port';

interface FieldError {
  field: string;
  message: string;
}

/**
 * Cas d'utilisation : consultation, création et modification d'une
 * commande (écran « Commande »), et son temps passé (pointages).
 *
 * Règles : client existant (actif pour une création ou un changement de
 * client), contrat appartenant au client, type de commande du paramétrage
 * TYPC ; le client ne change plus dès qu'un pointage est rattaché. Pas de
 * suppression de commande.
 */
@Injectable()
export class CommandeFicheUseCase {
  constructor(
    @Inject(COMMANDE_FICHE) private readonly fiche: CommandeFichePort,
    @Inject(COMMANDE_LIST) private readonly list: CommandeListPort,
  ) {}

  async get(id: number): Promise<CommandeDetail> {
    const commande = await this.fiche.findCommande(id);
    if (!commande) {
      throw new ResourceNotFoundException('La commande');
    }
    return commande;
  }

  async create(input: CommandeInput, userId: string): Promise<CommandeDetail> {
    await this.assertReferences(input, null);
    const id = await this.fiche.createCommande(input, userId);
    return this.get(id);
  }

  async update(
    id: number,
    input: CommandeInput,
    userId: string,
  ): Promise<CommandeDetail> {
    const current = await this.get(id);
    await this.assertReferences(input, current);
    await this.fiche.updateCommande(id, input, userId);
    return this.get(id);
  }

  async temps(id: number): Promise<CommandeTemps> {
    await this.get(id);
    return this.fiche.temps(id, await this.list.heuresParJour());
  }

  private async assertReferences(
    input: CommandeInput,
    current: CommandeDetail | null,
  ): Promise<void> {
    const errors: FieldError[] = [];
    const clientChanged = !current || current.clientId !== input.clientId;

    if (clientChanged) {
      if (current?.hasPointages) {
        errors.push({
          field: 'clientId',
          message:
            'Des pointages sont rattachés à cette commande : le client ne peut plus être changé.',
        });
      } else if ((await this.fiche.findClientActif(input.clientId)) !== true) {
        errors.push({
          field: 'clientId',
          message: 'Ce client est introuvable ou inactif.',
        });
      }
    }
    if (
      input.clientContratId !== null &&
      !(await this.fiche.contratBelongsToClient(
        input.clientContratId,
        input.clientId,
      ))
    ) {
      errors.push({
        field: 'clientContratId',
        message: "Ce contrat n'appartient pas au client.",
      });
    }
    if (!(await this.fiche.parametreExists('TYPC', input.typeCommande))) {
      errors.push({
        field: 'typeCommande',
        message: 'Type de commande inconnu.',
      });
    }
    if (errors.length > 0) {
      throw new ValidationException(errors);
    }
  }
}
