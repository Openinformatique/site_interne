import { Inject, Injectable } from '@nestjs/common';
import { ResourceNotFoundException } from '../../../common/exceptions/app-exceptions';
import { CLIENT_FICHE } from '../domain/client-fiche.port';
import type {
  ClientCommandesFilter,
  ClientFichePort,
  CommandeSummary,
  Contact,
  ContactInput,
  ContratInput,
  ContratMouvement,
  ContratSummary,
} from '../domain/client-fiche.port';

/**
 * Cas d'utilisation : contrats (avec leur suivi en heures), contacts et
 * commandes d'un client, affichés dans la fiche client. Les contrats et
 * contacts sont enregistrés immédiatement ; jamais supprimés.
 */
@Injectable()
export class ClientRelationsUseCase {
  constructor(
    @Inject(CLIENT_FICHE)
    private readonly fiche: ClientFichePort,
  ) {}

  async listContrats(clientId: number): Promise<ContratSummary[]> {
    await this.assertClient(clientId);
    return this.fiche.listContrats(clientId, await this.fiche.heuresParJour());
  }

  async listMouvements(
    clientId: number,
    contratId: number,
  ): Promise<ContratMouvement[]> {
    await this.assertContrat(clientId, contratId);
    return this.fiche.listMouvements(
      contratId,
      await this.fiche.heuresParJour(),
    );
  }

  async createContrat(
    clientId: number,
    input: ContratInput,
    userId: string,
  ): Promise<ContratSummary> {
    await this.assertClient(clientId);
    const id = await this.fiche.createContrat(clientId, input, userId);
    return this.findContrat(clientId, id);
  }

  async updateContrat(
    clientId: number,
    contratId: number,
    input: ContratInput,
    userId: string,
  ): Promise<ContratSummary> {
    await this.assertContrat(clientId, contratId);
    await this.fiche.updateContrat(contratId, input, userId);
    return this.findContrat(clientId, contratId);
  }

  async listContacts(clientId: number): Promise<Contact[]> {
    await this.assertClient(clientId);
    return this.fiche.listContacts(clientId);
  }

  async createContact(
    clientId: number,
    input: ContactInput,
    userId: string,
  ): Promise<Contact> {
    await this.assertClient(clientId);
    const id = await this.fiche.createContact(clientId, input, userId);
    return this.findContact(clientId, id);
  }

  async updateContact(
    clientId: number,
    contactId: number,
    input: ContactInput,
    userId: string,
  ): Promise<Contact> {
    if (!(await this.fiche.contactBelongsTo(clientId, contactId))) {
      throw new ResourceNotFoundException('Le contact');
    }
    await this.fiche.updateContact(contactId, input, userId);
    return this.findContact(clientId, contactId);
  }

  async listCommandes(
    clientId: number,
    filter: ClientCommandesFilter,
  ): Promise<CommandeSummary[]> {
    await this.assertClient(clientId);
    return this.fiche.listCommandes(
      clientId,
      filter,
      await this.fiche.heuresParJour(),
    );
  }

  private async assertClient(clientId: number): Promise<void> {
    if (!(await this.fiche.findClient(clientId))) {
      throw new ResourceNotFoundException('Le client');
    }
  }

  private async assertContrat(
    clientId: number,
    contratId: number,
  ): Promise<void> {
    if (!(await this.fiche.contratBelongsTo(clientId, contratId))) {
      throw new ResourceNotFoundException('Le contrat');
    }
  }

  private async findContrat(
    clientId: number,
    contratId: number,
  ): Promise<ContratSummary> {
    const contrats = await this.listContrats(clientId);
    return contrats.find((contrat) => contrat.id === contratId)!;
  }

  private async findContact(
    clientId: number,
    contactId: number,
  ): Promise<Contact> {
    const contacts = await this.fiche.listContacts(clientId);
    return contacts.find((contact) => contact.id === contactId)!;
  }
}
