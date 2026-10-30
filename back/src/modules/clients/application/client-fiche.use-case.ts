import { Inject, Injectable } from '@nestjs/common';
import {
  ResourceNotFoundException,
  ValidationException,
} from '../../../common/exceptions/app-exceptions';
import { CLIENT_FICHE } from '../domain/client-fiche.port';
import type {
  ClientDetail,
  ClientFichePort,
  ClientInput,
} from '../domain/client-fiche.port';

/**
 * Cas d'utilisation : consultation, création et modification d'un client
 * (écran « Fiche client »). Le code client est unique (casse ignorée) et
 * enregistré en majuscules. Pas de suppression : le client est désactivé.
 */
@Injectable()
export class ClientFicheUseCase {
  constructor(
    @Inject(CLIENT_FICHE)
    private readonly fiche: ClientFichePort,
  ) {}

  async get(id: number): Promise<ClientDetail> {
    const client = await this.fiche.findClient(id);
    if (!client) {
      throw new ResourceNotFoundException('Le client');
    }
    return client;
  }

  async create(input: ClientInput, userId: string): Promise<ClientDetail> {
    const normalized = normalize(input);
    await this.assertCodeAvailable(normalized.codeClient);
    const id = await this.fiche.createClient(normalized, userId);
    return this.get(id);
  }

  async update(
    id: number,
    input: ClientInput,
    userId: string,
  ): Promise<ClientDetail> {
    await this.get(id);
    const normalized = normalize(input);
    await this.assertCodeAvailable(normalized.codeClient, id);
    await this.fiche.updateClient(id, normalized, userId);
    return this.get(id);
  }

  private async assertCodeAvailable(
    codeClient: string,
    excludeId?: number,
  ): Promise<void> {
    if (await this.fiche.codeExists(codeClient, excludeId)) {
      throw new ValidationException([
        { field: 'codeClient', message: 'Ce code client est déjà utilisé.' },
      ]);
    }
  }
}

function normalize(input: ClientInput): ClientInput {
  return { ...input, codeClient: input.codeClient.trim().toUpperCase() };
}
