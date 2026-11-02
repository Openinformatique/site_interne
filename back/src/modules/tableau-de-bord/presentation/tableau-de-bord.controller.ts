import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { TableauDeBordUseCase } from '../application/tableau-de-bord.use-case';
import {
  CommandeALivrerResponseDto,
  CongesResponseDto,
  ContratARenouvelerResponseDto,
} from './dto/tableau-de-bord.dto';

/** Modules du tableau de bord. Accessibles à tout utilisateur authentifié. */
@ApiTags('Tableau de bord')
@ApiBearerAuth()
@Controller('tableau-de-bord')
export class TableauDeBordController {
  constructor(private readonly tableauDeBord: TableauDeBordUseCase) {}

  @Get('contrats-a-renouveler')
  @ApiOperation({
    summary: 'Contrats à renouveler',
    description:
      "Contrats non échus de clients actifs, de plus d'1 h de crédit, dont il reste 1 h ou moins (négatif compris) ; du restant le plus bas au plus haut.",
  })
  @ApiOkResponse({ type: ContratARenouvelerResponseDto, isArray: true })
  async contratsARenouveler(): Promise<ContratARenouvelerResponseDto[]> {
    const contrats = await this.tableauDeBord.contratsARenouveler();
    return contrats.map((contrat) =>
      ContratARenouvelerResponseDto.fromDomain(contrat),
    );
  }

  @Get('commandes-a-livrer')
  @ApiOperation({
    summary: 'Commandes à livrer',
    description:
      'Commandes non clôturées dont le délai est dépassé ou dans les 14 prochains jours ; par délai croissant.',
  })
  @ApiOkResponse({ type: CommandeALivrerResponseDto, isArray: true })
  async commandesALivrer(): Promise<CommandeALivrerResponseDto[]> {
    const commandes = await this.tableauDeBord.commandesALivrer();
    return commandes.map((commande) =>
      CommandeALivrerResponseDto.fromDomain(commande),
    );
  }

  @Get('conges')
  @ApiOperation({
    summary: 'Congés des 15 prochains jours',
    description:
      "Congés (pointages CP) de toute l'équipe touchant aujourd'hui et les 14 jours suivants, avec les fériés pointés de chacun.",
  })
  @ApiOkResponse({ type: CongesResponseDto })
  async conges(): Promise<CongesResponseDto> {
    return CongesResponseDto.fromDomain(await this.tableauDeBord.conges());
  }
}
