import { Controller, Get, Query, Res, StreamableFile } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user';
import { ExportCflUseCase } from '../application/export-cfl.use-case';
import { ExportCflQueryDto } from './dto/export-cfl.dto';

/**
 * « Export (format CFL) » (Pointages › Éditions). Contrôleur séparé de
 * PointagesController (même préfixe `pointages`, route distincte).
 */
@ApiTags('Pointages')
@ApiBearerAuth()
@Controller('pointages')
export class ExportCflController {
  constructor(private readonly exportCfl: ExportCflUseCase) {}

  @Get('export-cfl.pdf')
  @ApiOperation({
    summary:
      'Édition PDF « Export (format CFL) » : travaux réalisés pour un client',
    description:
      'Pointages du client commençant dans la période (jours à Paris, bornes incluses), filtrés par commande, ' +
      'personne, type et tags (au moins un, ou sans tag), du plus récent au plus ancien ; durée du créneau en minutes. ' +
      'Admin / Direction : tous ou une personne ; autres profils : leurs pointages. Renvoyé « inline ».',
  })
  @ApiProduces('application/pdf')
  @ApiOkResponse({ description: 'Fichier PDF.' })
  @ApiBadRequestResponse({ description: 'Critères invalides.' })
  @ApiForbiddenResponse({ description: 'Pointages d’une autre personne.' })
  @ApiNotFoundResponse({ description: 'Client ou commande introuvable.' })
  async pdf(
    @Query() query: ExportCflQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.exportCfl.execute(user, {
      du: query.du,
      au: query.au,
      clientId: query.clientId,
      commandeId: query.commandeId ?? null,
      utilisateurId: query.utilisateurId ?? null,
      typeAction: query.typeAction ?? null,
      tags: query.tags ?? [],
      sansTag: query.sansTag ?? false,
    });
    const encode = encodeURIComponent(filename);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${encode}"; filename*=UTF-8''${encode}`,
    );
    return new StreamableFile(buffer);
  }
}
