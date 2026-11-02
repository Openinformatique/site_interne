import { Controller, Get, Query, Res, StreamableFile } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ContratsAssistanceZipUseCase } from '../application/contrats-assistance-zip.use-case';
import {
  ContratAssistanceResponseDto,
  EditionContratsQueryDto,
} from './dto/contrats-assistance.dto';

/**
 * Édition groupée des contrats d'assistance (Pointages › Éditions ›
 * Contrats d'assistance). Accessible à tout utilisateur authentifié.
 */
@ApiTags('Clients')
@ApiBearerAuth()
@Controller('contrats-assistance')
export class ContratsAssistanceController {
  constructor(private readonly edition: ContratsAssistanceZipUseCase) {}

  @Get()
  @ApiOperation({
    summary: "Contrats proposés à l'édition groupée",
    description:
      'Tous les contrats des clients, avec groupe (GSOC) et dates : la fenêtre filtre en cascade et compte les contrats en cours.',
  })
  @ApiOkResponse({ type: ContratAssistanceResponseDto, isArray: true })
  async list(): Promise<ContratAssistanceResponseDto[]> {
    const contrats = await this.edition.list();
    return contrats.map((contrat) =>
      ContratAssistanceResponseDto.fromDomain(contrat),
    );
  }

  @Get('edition.zip')
  @ApiOperation({
    summary: 'Zip des « Suivi du contrat » arrêtés à une date',
    description:
      "Un PDF par contrat en cours à la date d'arrêté et retenu par les filtres ; « Client - Contrat.pdf ».",
  })
  @ApiProduces('application/zip')
  @ApiOkResponse({ description: 'Fichier zip.' })
  @ApiBadRequestResponse({
    description: 'Critères invalides ou aucun contrat ne correspond.',
  })
  async zip(
    @Query() query: EditionContratsQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.edition.execute({
      arreteAu: query.arreteAu,
      groupe: query.groupe ?? null,
      clientId: query.clientId ?? null,
      contratId: query.contratId ?? null,
    });
    response.setHeader('Content-Type', 'application/zip');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    return new StreamableFile(buffer);
  }
}
