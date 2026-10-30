import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ValidationException } from '../../../common/exceptions/app-exceptions';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user';
import { PaginatedResult } from '../../../common/pagination/paginated-result';
import { SortDirection } from '../../../common/pagination/sort-direction.enum';
import { ClientFicheUseCase } from '../application/client-fiche.use-case';
import { ClientRelationsUseCase } from '../application/client-relations.use-case';
import { ListClientsUseCase } from '../application/list-clients.use-case';
import { ClientCommandesQueryDto } from './dto/client-commandes-query.dto';
import {
  ClientCommandeResponseDto,
  ClientDetailResponseDto,
  ContactResponseDto,
  ContratMouvementResponseDto,
  ContratResponseDto,
} from './dto/client-fiche-response.dto';
import { ClientSummaryResponseDto } from './dto/client-summary-response.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';
import { SaveClientRequestDto } from './dto/save-client-request.dto';
import { SaveContactRequestDto } from './dto/save-contact-request.dto';
import { SaveContratRequestDto } from './dto/save-contrat-request.dto';

/** Pipe entier avec erreur au format standard (VALIDATION_ERROR, français). */
const idPipe = (field: string) =>
  new ParseIntPipe({
    exceptionFactory: () =>
      new ValidationException([
        { field, message: "L'identifiant doit être un entier." },
      ]),
  });

/**
 * Clients — contrat consommé par le module clients du front (liste et
 * fiche client). Accessible à tout utilisateur authentifié (guard JWT
 * global) : tous les rôles consultent, créent et modifient.
 */
@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(
    private readonly listClients: ListClientsUseCase,
    private readonly fiche: ClientFicheUseCase,
    private readonly relations: ClientRelationsUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Liste paginée des clients',
    description:
      'Actifs uniquement par défaut. Recherche multi-mots insensible à la casse et aux accents ' +
      '(code, raison sociale, adresses, CP, ville, pays, n° TVA, groupe). Tri par défaut : raison sociale.',
  })
  @ApiOkResponse({ type: ClientSummaryResponseDto, isArray: true })
  async list(
    @Query() query: ListClientsQueryDto,
  ): Promise<PaginatedResult<ClientSummaryResponseDto>> {
    const result = await this.listClients.execute({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy ?? 'raisonSociale',
      sortDirection: query.sortDirection ?? SortDirection.Asc,
      search: query.search,
      includeInactive: query.includeInactive ?? false,
      groupes: query.groupes ?? [],
      sansGroupe: query.sansGroupe ?? false,
    });
    return {
      items: result.items.map((client) =>
        ClientSummaryResponseDto.fromDomain(client),
      ),
      meta: result.meta,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Créer un client' })
  @ApiCreatedResponse({ type: ClientDetailResponseDto })
  @ApiBadRequestResponse({
    description:
      'Champ invalide ou code client déjà utilisé (VALIDATION_ERROR).',
  })
  async create(
    @Body() body: SaveClientRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ClientDetailResponseDto> {
    return ClientDetailResponseDto.fromDomain(
      await this.fiche.create(body, user.userId),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fiche client' })
  @ApiOkResponse({ type: ClientDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Client inconnu (RESOURCE_NOT_FOUND).' })
  async get(
    @Param('id', idPipe('id')) id: number,
  ): Promise<ClientDetailResponseDto> {
    return ClientDetailResponseDto.fromDomain(await this.fiche.get(id));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un client' })
  @ApiOkResponse({ type: ClientDetailResponseDto })
  @ApiBadRequestResponse({
    description:
      'Champ invalide ou code client déjà utilisé (VALIDATION_ERROR).',
  })
  @ApiNotFoundResponse({ description: 'Client inconnu (RESOURCE_NOT_FOUND).' })
  async update(
    @Param('id', idPipe('id')) id: number,
    @Body() body: SaveClientRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ClientDetailResponseDto> {
    return ClientDetailResponseDto.fromDomain(
      await this.fiche.update(id, body, user.userId),
    );
  }

  @Get(':id/contrats')
  @ApiOperation({ summary: "Contrats d'un client, avec leur suivi (heures)" })
  @ApiOkResponse({ type: ContratResponseDto, isArray: true })
  async listContrats(
    @Param('id', idPipe('id')) id: number,
  ): Promise<ContratResponseDto[]> {
    const contrats = await this.relations.listContrats(id);
    return contrats.map((contrat) => ContratResponseDto.fromDomain(contrat));
  }

  @Post(':id/contrats')
  @ApiOperation({ summary: 'Créer un contrat' })
  @ApiCreatedResponse({ type: ContratResponseDto })
  async createContrat(
    @Param('id', idPipe('id')) id: number,
    @Body() body: SaveContratRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContratResponseDto> {
    return ContratResponseDto.fromDomain(
      await this.relations.createContrat(id, body, user.userId),
    );
  }

  @Put(':id/contrats/:contratId')
  @ApiOperation({ summary: 'Modifier un contrat' })
  @ApiOkResponse({ type: ContratResponseDto })
  async updateContrat(
    @Param('id', idPipe('id')) id: number,
    @Param('contratId', idPipe('contratId')) contratId: number,
    @Body() body: SaveContratRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContratResponseDto> {
    return ContratResponseDto.fromDomain(
      await this.relations.updateContrat(id, contratId, body, user.userId),
    );
  }

  @Get(':id/contrats/:contratId/mouvements')
  @ApiOperation({
    summary: "Mouvements du suivi d'un contrat",
    description:
      'Commandes du contrat (crédit = jours commandés × HJOUR) et pointages sur ces commandes (débit), par date.',
  })
  @ApiOkResponse({ type: ContratMouvementResponseDto, isArray: true })
  async listMouvements(
    @Param('id', idPipe('id')) id: number,
    @Param('contratId', idPipe('contratId')) contratId: number,
  ): Promise<ContratMouvementResponseDto[]> {
    const mouvements = await this.relations.listMouvements(id, contratId);
    return mouvements.map((mouvement) =>
      ContratMouvementResponseDto.fromDomain(mouvement),
    );
  }

  @Get(':id/contacts')
  @ApiOperation({ summary: "Contacts d'un client (actifs et inactifs)" })
  @ApiOkResponse({ type: ContactResponseDto, isArray: true })
  async listContacts(
    @Param('id', idPipe('id')) id: number,
  ): Promise<ContactResponseDto[]> {
    const contacts = await this.relations.listContacts(id);
    return contacts.map((contact) => ContactResponseDto.fromDomain(contact));
  }

  @Post(':id/contacts')
  @ApiOperation({ summary: 'Créer un contact' })
  @ApiCreatedResponse({ type: ContactResponseDto })
  async createContact(
    @Param('id', idPipe('id')) id: number,
    @Body() body: SaveContactRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContactResponseDto> {
    return ContactResponseDto.fromDomain(
      await this.relations.createContact(id, body, user.userId),
    );
  }

  @Put(':id/contacts/:contactId')
  @ApiOperation({ summary: 'Modifier un contact' })
  @ApiOkResponse({ type: ContactResponseDto })
  async updateContact(
    @Param('id', idPipe('id')) id: number,
    @Param('contactId', idPipe('contactId')) contactId: number,
    @Body() body: SaveContactRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContactResponseDto> {
    return ContactResponseDto.fromDomain(
      await this.relations.updateContact(id, contactId, body, user.userId),
    );
  }

  @Get(':id/commandes')
  @ApiOperation({
    summary: "Commandes d'un client",
    description:
      'Non clôturées par défaut, triées par date de devis décroissante. Période : date du devis OU de commande.',
  })
  @ApiOkResponse({ type: ClientCommandeResponseDto, isArray: true })
  async listCommandes(
    @Param('id', idPipe('id')) id: number,
    @Query() query: ClientCommandesQueryDto,
  ): Promise<ClientCommandeResponseDto[]> {
    const commandes = await this.relations.listCommandes(id, {
      includeClosed: query.includeClosed ?? false,
      du: query.du ?? null,
      au: query.au ?? null,
    });
    return commandes.map((commande) =>
      ClientCommandeResponseDto.fromDomain(commande),
    );
  }
}
