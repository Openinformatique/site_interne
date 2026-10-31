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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ValidationException } from '../../../common/exceptions/app-exceptions';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user';
import { CommandeDocumentsUseCase } from '../application/commande-documents.use-case';
import { CommandeFicheUseCase } from '../application/commande-fiche.use-case';
import {
  CommandeDetailResponseDto,
  CommandeDocumentResponseDto,
  CommandeTempsResponseDto,
} from './dto/commande-fiche-response.dto';
import {
  AddDocumentRequestDto,
  SaveCommandeRequestDto,
} from './dto/save-commande-request.dto';

/** Pipe entier avec erreur au format standard (VALIDATION_ERROR, français). */
const idPipe = (field: string) =>
  new ParseIntPipe({
    exceptionFactory: () =>
      new ValidationException([
        { field, message: "L'identifiant doit être un entier." },
      ]),
  });

const INLINE_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
];

/**
 * Fiche commande — consultation, création, modification, temps passé et
 * documents. Accessible à tout utilisateur authentifié (guard JWT global).
 * Déclaré après CommandesController : `/commandes/clients` et
 * `/commandes/export` sont résolus avant `/commandes/:id`.
 */
@ApiTags('Commandes')
@ApiBearerAuth()
@Controller('commandes')
export class CommandeFicheController {
  constructor(
    private readonly fiche: CommandeFicheUseCase,
    private readonly documents: CommandeDocumentsUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Créer une commande' })
  @ApiCreatedResponse({ type: CommandeDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Champ invalide (VALIDATION_ERROR).' })
  async create(
    @Body() body: SaveCommandeRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CommandeDetailResponseDto> {
    return CommandeDetailResponseDto.fromDomain(
      await this.fiche.create(body, user.userId),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fiche commande' })
  @ApiOkResponse({ type: CommandeDetailResponseDto })
  @ApiNotFoundResponse({
    description: 'Commande inconnue (RESOURCE_NOT_FOUND).',
  })
  async get(
    @Param('id', idPipe('id')) id: number,
  ): Promise<CommandeDetailResponseDto> {
    return CommandeDetailResponseDto.fromDomain(await this.fiche.get(id));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier une commande' })
  @ApiOkResponse({ type: CommandeDetailResponseDto })
  @ApiBadRequestResponse({
    description:
      'Champ invalide, ou changement de client alors que des pointages sont rattachés (VALIDATION_ERROR).',
  })
  async update(
    @Param('id', idPipe('id')) id: number,
    @Body() body: SaveCommandeRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CommandeDetailResponseDto> {
    return CommandeDetailResponseDto.fromDomain(
      await this.fiche.update(id, body, user.userId),
    );
  }

  @Get(':id/temps')
  @ApiOperation({
    summary: 'Temps passé sur la commande',
    description:
      'Jours facturables (heures ÷ TDIV/HJOUR) : cumul par personne (décroissant) et pointages (plus récents d’abord).',
  })
  @ApiOkResponse({ type: CommandeTempsResponseDto })
  async temps(
    @Param('id', idPipe('id')) id: number,
  ): Promise<CommandeTempsResponseDto> {
    return CommandeTempsResponseDto.fromDomain(await this.fiche.temps(id));
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'Documents de la commande (plus récents d’abord)' })
  @ApiOkResponse({ type: CommandeDocumentResponseDto, isArray: true })
  async listDocuments(
    @Param('id', idPipe('id')) id: number,
  ): Promise<CommandeDocumentResponseDto[]> {
    return (await this.documents.list(id)).map((document) =>
      CommandeDocumentResponseDto.fromDomain(document),
    );
  }

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        typeDocument: { type: 'string', description: 'Clé TDOC.' },
        commentaire: { type: 'string' },
      },
      required: ['file', 'typeDocument'],
    },
  })
  @ApiOperation({
    summary: 'Ajouter un document',
    description:
      'Type MIME et taille contrôlés par la configuration du stockage.',
  })
  @ApiCreatedResponse({ type: CommandeDocumentResponseDto })
  async addDocument(
    @Param('id', idPipe('id')) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: AddDocumentRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CommandeDocumentResponseDto> {
    if (!file) {
      throw new ValidationException([
        { field: 'file', message: 'Un fichier est requis.' },
      ]);
    }
    const document = await this.documents.add(
      id,
      {
        typeDocument: body.typeDocument,
        commentaire: body.commentaire,
        file: {
          originalName: decodeFilename(file.originalname),
          mimeType: file.mimetype,
          content: file.buffer,
        },
      },
      user.userId,
    );
    return CommandeDocumentResponseDto.fromDomain(document);
  }

  @Get(':id/documents/:documentId/fichier')
  @ApiOperation({
    summary: 'Contenu d’un document',
    description:
      '`inline=true` : affichage dans le navigateur ; sinon téléchargement.',
  })
  @ApiQuery({ name: 'inline', required: false, type: Boolean })
  async readDocument(
    @Param('id', idPipe('id')) id: number,
    @Param('documentId', idPipe('documentId')) documentId: number,
    @Query('inline') inline: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const { fichier, stream } = await this.documents.read(id, documentId);
    const filename = fichier.nomFichier || `document-${fichier.id}`;
    // Affichage dans le navigateur réservé aux PDF et images matricielles
    // (jamais HTML ou SVG, qui pourraient exécuter du script).
    const disposition =
      inline === 'true' && INLINE_MIME_TYPES.includes(fichier.typeMime)
        ? 'inline'
        : 'attachment';
    response.setHeader('Content-Type', fichier.typeMime);
    response.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    return new StreamableFile(stream);
  }

  @Delete(':id/documents/:documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un document (fichier compris)' })
  @ApiNoContentResponse({ description: 'Document supprimé.' })
  async deleteDocument(
    @Param('id', idPipe('id')) id: number,
    @Param('documentId', idPipe('documentId')) documentId: number,
  ): Promise<void> {
    await this.documents.delete(id, documentId);
  }
}

/**
 * Nom de fichier multipart : multer le lit en latin-1 alors que les
 * navigateurs l'envoient en UTF-8 ; on le redécode (accents), sauf si le
 * résultat n'est pas de l'UTF-8 valide.
 */
function decodeFilename(name: string): string {
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? name : decoded;
}
