import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user';
import { UserRole } from '../../users/domain/user-role.enum';
import { ParametresAdminUseCase } from '../application/parametres-admin.use-case';
import {
  CreateParametreRequestDto,
  CreateTableRequestDto,
  SaveParametreRequestDto,
  SaveTableRequestDto,
} from './dto/parametres-admin-request.dto';
import {
  ParametreResponseDto,
  TableParametresResponseDto,
} from './dto/parametres-admin-response.dto';

/**
 * Administration du paramétrage (écran « Paramètres ») : tables, rubriques
 * et paramètres. Réservée aux rôles ADMIN et DIRECTION.
 */
@ApiTags('Paramètres')
@ApiBearerAuth()
@Roles(UserRole.Admin, UserRole.Direction)
@Controller('parametres/admin/tables')
export class ParametresAdminController {
  constructor(private readonly admin: ParametresAdminUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Tables de paramètres (avec rubriques), par code' })
  @ApiOkResponse({ type: TableParametresResponseDto, isArray: true })
  async listTables(): Promise<TableParametresResponseDto[]> {
    return (await this.admin.listTables()).map((table) =>
      TableParametresResponseDto.fromDomain(table),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Créer une table et ses rubriques' })
  @ApiCreatedResponse({ type: TableParametresResponseDto })
  @ApiBadRequestResponse({ description: 'Code invalide ou déjà utilisé.' })
  async createTable(
    @Body() body: CreateTableRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TableParametresResponseDto> {
    const { code, ...input } = body;
    return TableParametresResponseDto.fromDomain(
      await this.admin.createTable(code, input, user.userId),
    );
  }

  @Put(':code')
  @ApiOperation({
    summary: 'Modifier une table et ses rubriques',
    description:
      'Rubriques renumérotées dans l’ordre reçu ; une rubrique supprimée efface ses valeurs. La rubrique 01 reste en tête.',
  })
  @ApiOkResponse({ type: TableParametresResponseDto })
  async updateTable(
    @Param('code') code: string,
    @Body() body: SaveTableRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TableParametresResponseDto> {
    return TableParametresResponseDto.fromDomain(
      await this.admin.updateTable(code, body, user.userId),
    );
  }

  @Delete(':code')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une table vide (et ses rubriques)' })
  @ApiNoContentResponse({ description: 'Table supprimée.' })
  async deleteTable(@Param('code') code: string): Promise<void> {
    await this.admin.deleteTable(code);
  }

  @Get(':code/parametres')
  @ApiOperation({
    summary: 'Paramètres d’une table (actifs et inactifs), par clé',
  })
  @ApiOkResponse({ type: ParametreResponseDto, isArray: true })
  async listParametres(
    @Param('code') code: string,
  ): Promise<ParametreResponseDto[]> {
    return (await this.admin.listParametres(code)).map((parametre) =>
      ParametreResponseDto.fromDomain(parametre),
    );
  }

  @Post(':code/parametres')
  @ApiOperation({ summary: 'Créer un paramètre' })
  @ApiCreatedResponse({ type: ParametreResponseDto })
  async createParametre(
    @Param('code') code: string,
    @Body() body: CreateParametreRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ParametreResponseDto> {
    return ParametreResponseDto.fromDomain(
      await this.admin.createParametre(code, body, user.userId),
    );
  }

  @Put(':code/parametres/:cle')
  @ApiOperation({ summary: 'Modifier un paramètre (valeurs, statut)' })
  @ApiOkResponse({ type: ParametreResponseDto })
  async updateParametre(
    @Param('code') code: string,
    @Param('cle') cle: string,
    @Body() body: SaveParametreRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ParametreResponseDto> {
    return ParametreResponseDto.fromDomain(
      await this.admin.updateParametre(code, cle, body, user.userId),
    );
  }

  @Delete(':code/parametres/:cle')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Supprimer un paramètre',
    description:
      'Refusé si la clé est utilisée dans l’application (le désactiver).',
  })
  @ApiNoContentResponse({ description: 'Paramètre supprimé.' })
  async deleteParametre(
    @Param('code') code: string,
    @Param('cle') cle: string,
  ): Promise<void> {
    await this.admin.deleteParametre(code, cle);
  }
}
