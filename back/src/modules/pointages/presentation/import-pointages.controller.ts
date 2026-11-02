import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ValidationException } from '../../../common/exceptions/app-exceptions';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user';
import { ImportPointagesUseCase } from '../application/import-pointages.use-case';
import {
  ImportPointagesRequestDto,
  ResultatImportDto,
} from './dto/import-pointages.dto';

/** Taille maximale du classeur importé. */
const TAILLE_MAX = 5 * 1024 * 1024;

const CORPS = {
  schema: {
    type: 'object',
    properties: {
      file: { type: 'string', format: 'binary' },
      utilisateurId: { type: 'string', format: 'uuid' },
    },
    required: ['file', 'utilisateurId'],
  },
};

/**
 * Import de pointages depuis un classeur Excel (écran Pointages, bouton
 * « Importer »). Droits de la saisie : ses propres pointages, ou ceux de tous
 * pour Admin et Direction.
 */
@ApiTags('Pointages')
@ApiBearerAuth()
@Controller('pointages/import')
export class ImportPointagesController {
  constructor(private readonly importPointages: ImportPointagesUseCase) {}

  @Post('verification')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: TAILLE_MAX } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody(CORPS)
  @ApiOperation({
    summary: "Vérifier un classeur d'import",
    description:
      'Format (en-têtes de la ligne 1), lignes et références ; aperçu des pointages qui seraient créés. Ne crée rien.',
  })
  @ApiOkResponse({ type: ResultatImportDto })
  @ApiForbiddenResponse({ description: "Pointages d'une autre personne." })
  async verifier(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: ImportPointagesRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ResultatImportDto> {
    return ResultatImportDto.fromDomain(
      await this.importPointages.verifier(
        user,
        body.utilisateurId,
        fichier(file),
      ),
    );
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: TAILLE_MAX } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody(CORPS)
  @ApiOperation({
    summary: 'Importer un classeur de pointages',
    description:
      "Nouvelle vérification complète puis création de tous les pointages (transaction) ; au moindre défaut, rien n'est créé et les erreurs sont renvoyées.",
  })
  @ApiOkResponse({ type: ResultatImportDto })
  @ApiForbiddenResponse({ description: "Pointages d'une autre personne." })
  async importer(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: ImportPointagesRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ResultatImportDto> {
    return ResultatImportDto.fromDomain(
      await this.importPointages.importer(
        user,
        body.utilisateurId,
        fichier(file),
      ),
    );
  }
}

function fichier(file: Express.Multer.File | undefined): Buffer {
  if (!file) {
    throw new ValidationException([
      { field: 'file', message: 'Choisissez un classeur Excel.' },
    ]);
  }
  return file.buffer;
}
