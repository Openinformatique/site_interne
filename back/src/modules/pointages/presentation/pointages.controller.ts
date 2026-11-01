import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ValidationException } from '../../../common/exceptions/app-exceptions';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user';
import { PointagesUseCase } from '../application/pointages.use-case';
import type { PointageInput } from '../domain/pointage.port';
import {
  ClientPointageOptionsResponseDto,
  ListPointagesQueryDto,
  PointageResponseDto,
  PointagesReferenceResponseDto,
  SavePointageRequestDto,
} from './dto/pointage.dto';

/** Pipe entier avec erreur au format standard (VALIDATION_ERROR, français). */
const idPipe = (field: string) =>
  new ParseIntPipe({
    exceptionFactory: () =>
      new ValidationException([
        { field, message: "L'identifiant doit être un entier." },
      ]),
  });

const FORBIDDEN =
  'Pointages d’une autre personne : réservé aux profils Admin et Direction (ACCESS_DENIED).';

/**
 * Pointages — planning hebdomadaire et saisie. Tout utilisateur
 * authentifié gère ses pointages ; Admin et Direction ceux de tous.
 */
@ApiTags('Pointages')
@ApiBearerAuth()
@Controller('pointages')
export class PointagesController {
  constructor(private readonly pointages: PointagesUseCase) {}

  @Get('reference')
  @ApiOperation({
    summary: "Référentiels de l'écran",
    description:
      'Types d’action (TYPA, couleur), tags (TAGS), personnes sélectionnables et clients actifs.',
  })
  @ApiOkResponse({ type: PointagesReferenceResponseDto })
  reference(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PointagesReferenceResponseDto> {
    return this.pointages.reference(user);
  }

  @Get('clients/:clientId/options')
  @ApiOperation({ summary: "Contacts et commandes d'un client" })
  @ApiOkResponse({ type: ClientPointageOptionsResponseDto })
  async clientOptions(
    @Param('clientId', idPipe('clientId')) clientId: number,
  ): Promise<ClientPointageOptionsResponseDto> {
    const [contacts, commandes] = await Promise.all([
      this.pointages.contacts(clientId),
      this.pointages.commandes(clientId),
    ]);
    return { contacts, commandes };
  }

  @Get()
  @ApiOperation({ summary: "Pointages d'une personne sur une période" })
  @ApiOkResponse({ type: PointageResponseDto, isArray: true })
  @ApiForbiddenResponse({ description: FORBIDDEN })
  async list(
    @Query() query: ListPointagesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PointageResponseDto[]> {
    const pointages = await this.pointages.list(
      user,
      query.utilisateurId,
      new Date(query.du),
      new Date(query.au),
    );
    return pointages.map((pointage) =>
      PointageResponseDto.fromDomain(pointage),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Créer un pointage' })
  @ApiCreatedResponse({ type: PointageResponseDto })
  @ApiBadRequestResponse({
    description: 'Règle de saisie non respectée (VALIDATION_ERROR).',
  })
  @ApiForbiddenResponse({ description: FORBIDDEN })
  async create(
    @Body() body: SavePointageRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PointageResponseDto> {
    return PointageResponseDto.fromDomain(
      await this.pointages.create(user, toInput(body)),
    );
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Modifier un pointage (saisie, déplacement, durée)',
  })
  @ApiOkResponse({ type: PointageResponseDto })
  @ApiBadRequestResponse({
    description: 'Règle de saisie non respectée (VALIDATION_ERROR).',
  })
  @ApiForbiddenResponse({ description: FORBIDDEN })
  @ApiNotFoundResponse({
    description: 'Pointage inconnu (RESOURCE_NOT_FOUND).',
  })
  async update(
    @Param('id', idPipe('id')) id: number,
    @Body() body: SavePointageRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PointageResponseDto> {
    return PointageResponseDto.fromDomain(
      await this.pointages.update(user, id, toInput(body)),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un pointage' })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: FORBIDDEN })
  @ApiNotFoundResponse({
    description: 'Pointage inconnu (RESOURCE_NOT_FOUND).',
  })
  delete(
    @Param('id', idPipe('id')) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.pointages.delete(user, id);
  }
}

function toInput(body: SavePointageRequestDto): PointageInput {
  return { ...body, debut: new Date(body.debut), fin: new Date(body.fin) };
}
