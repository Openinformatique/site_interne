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
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ValidationException } from '../../../common/exceptions/app-exceptions';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user';
import { PointagesUseCase } from '../application/pointages.use-case';
import { ReleveMensuelUseCase } from '../application/releve-mensuel.use-case';
import type { PointageInput } from '../domain/pointage.port';
import {
  ClientPointageOptionsResponseDto,
  ListPointagesQueryDto,
  PointageResponseDto,
  PointagesReferenceResponseDto,
  ReleveMensuelQueryDto,
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

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

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
  constructor(
    private readonly pointages: PointagesUseCase,
    private readonly releve: ReleveMensuelUseCase,
  ) {}

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

  @Get('releve.pdf')
  @ApiOperation({
    summary: 'Édition PDF « Relevé mensuel des pointages »',
    description:
      'Pointages d’une personne commençant dans le mois (heure de Paris), par client, type d’action et commande. ' +
      '« detail » : une ligne par description et statut facturable, avec totaux ; « synthese » : une ligne par client et type d’action. ' +
      'Renvoyé « inline » : le front l’ouvre dans la visionneuse du navigateur.',
  })
  @ApiProduces('application/pdf')
  @ApiOkResponse({ description: 'Fichier PDF.' })
  @ApiForbiddenResponse({ description: FORBIDDEN })
  @ApiNotFoundResponse({ description: 'Personne inconnue.' })
  async releveMensuelPdf(
    @Query() query: ReleveMensuelQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.releve.pdf(
      user,
      query.utilisateurId,
      query.annee,
      query.mois,
      query.contenu === 'synthese',
    );
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', disposition('inline', filename));
    return new StreamableFile(buffer);
  }

  @Get('releve.xlsx')
  @ApiOperation({
    summary: 'Relevé mensuel des pointages au format Excel (détaillé)',
    description:
      'Mêmes lignes que le PDF détaillé, en tableau filtrable : client, type d’action, commande, description, temps, facturable ; total en bas. ' +
      '`contenu` est ignoré.',
  })
  @ApiProduces(XLSX_MIME)
  @ApiOkResponse({ description: 'Classeur Excel.' })
  @ApiForbiddenResponse({ description: FORBIDDEN })
  @ApiNotFoundResponse({ description: 'Personne inconnue.' })
  async releveMensuelExcel(
    @Query() query: ReleveMensuelQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.releve.excel(
      user,
      query.utilisateurId,
      query.annee,
      query.mois,
    );
    response.setHeader('Content-Type', XLSX_MIME);
    response.setHeader(
      'Content-Disposition',
      disposition('attachment', filename),
    );
    return new StreamableFile(buffer);
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

/** En-tête Content-Disposition avec nom de fichier accentué (RFC 5987). */
function disposition(type: 'inline' | 'attachment', filename: string): string {
  const encode = encodeURIComponent(filename);
  return `${type}; filename="${encode}"; filename*=UTF-8''${encode}`;
}

function toInput(body: SavePointageRequestDto): PointageInput {
  return { ...body, debut: new Date(body.debut), fin: new Date(body.fin) };
}
