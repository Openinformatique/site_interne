import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../common/pagination/paginated-result';
import { PaginationMetaDto } from '../../../common/pagination/pagination-meta.dto';
import {
  COMMANDE_LIST,
  COMMANDES_SPREADSHEET,
} from '../domain/commande-list.port';
import type {
  CommandeClientOption,
  CommandeListItem,
  CommandeListPort,
  CommandesFilter,
  CommandesSpreadsheetPort,
  ListCommandesQuery,
} from '../domain/commande-list.port';

/** Fichier Excel produit par l'export de la liste. */
export interface CommandesExport {
  filename: string;
  content: Buffer;
}

/**
 * Cas d'utilisation : liste paginée des commandes (écran « Commandes »),
 * clients proposés dans le filtre, et export Excel de la liste filtrée
 * (toutes les pages, dans l'ordre du tri).
 */
@Injectable()
export class ListCommandesUseCase {
  constructor(
    @Inject(COMMANDE_LIST) private readonly commandes: CommandeListPort,
    @Inject(COMMANDES_SPREADSHEET)
    private readonly spreadsheet: CommandesSpreadsheetPort,
  ) {}

  async list(
    query: ListCommandesQuery,
  ): Promise<PaginatedResult<CommandeListItem>> {
    const page = await this.commandes.findPage(
      query,
      await this.commandes.heuresParJour(),
    );
    return {
      items: page.items,
      meta: PaginationMetaDto.fromTotals(
        query.page,
        query.limit,
        page.totalItems,
      ),
    };
  }

  clients(): Promise<CommandeClientOption[]> {
    return this.commandes.listClients();
  }

  async export(
    filter: CommandesFilter,
    today: Date = new Date(),
  ): Promise<CommandesExport> {
    const rows = await this.commandes.findAll(
      filter,
      await this.commandes.heuresParJour(),
    );
    return {
      filename: `commandes_${localIsoDate(today)}.xlsx`,
      content: await this.spreadsheet.build(rows),
    };
  }
}

function localIsoDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
