import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import type {
  Parametre,
  ParametreAdminPort,
  Rubrique,
  RubriquesChange,
  TableInput,
  TableParametres,
} from '../domain/parametre-admin.port';
import { ParametreIntegriteEntity } from './entities/parametre-integrite.entity';
import { ParametreRubriqueEntity } from './entities/parametre-rubrique.entity';
import { ParametreTableEntity } from './entities/parametre-table.entity';
import { ParametreEntity } from './entities/parametre.entity';

const RUBRIQUE_LIBELLE = '01';

/**
 * Colonnes de l'application qui stockent une clé de paramètre (contrôle avant
 * suppression). `parLibelle` : la colonne stocke le libellé (rubrique 01),
 * pas la clé (ex. le poste d'un contact). Liste blanche : noms SQL fixes.
 */
const UTILISATIONS: Record<
  string,
  { table: string; colonne: string; parLibelle?: boolean }[]
> = {
  TYPC: [{ table: 'commandes', colonne: 'type_commande' }],
  TDOC: [{ table: 'documents_commande', colonne: 'type_document' }],
  TYPA: [{ table: 'pointages', colonne: 'type_action' }],
  PAYS: [{ table: 'clients', colonne: 'code_pays' }],
  GSOC: [{ table: 'clients', colonne: 'groupe' }],
  REGL: [{ table: 'clients', colonne: 'mode_reglement' }],
  FONC: [{ table: 'contacts', colonne: 'poste', parLibelle: true }],
};

/** Adaptateur TypeORM du port ParametreAdminPort. */
@Injectable()
export class TypeOrmParametreAdminRepository implements ParametreAdminPort {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ParametreTableEntity)
    private readonly tables: Repository<ParametreTableEntity>,
    @InjectRepository(ParametreRubriqueEntity)
    private readonly rubriques: Repository<ParametreRubriqueEntity>,
    @InjectRepository(ParametreEntity)
    private readonly parametres: Repository<ParametreEntity>,
  ) {}

  // --- Tables ---------------------------------------------------------------

  async listTables(): Promise<TableParametres[]> {
    const tables = await this.tables.find({ order: { codeTable: 'ASC' } });
    return this.withDetails(tables);
  }

  async findTable(code: string): Promise<TableParametres | null> {
    const table = await this.tables.findOneBy({ codeTable: code });
    return table ? ((await this.withDetails([table]))[0] ?? null) : null;
  }

  async createTable(
    code: string,
    input: TableInput,
    rubriques: Rubrique[],
    userId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.save(
        manager.create(ParametreTableEntity, {
          codeTable: code,
          ...tableColumns(input),
          modifiableSuper: 1,
          createdBy: userId,
          updatedBy: userId,
        }),
      );
      await manager.save(
        rubriques.map((rubrique) =>
          manager.create(ParametreRubriqueEntity, {
            codeTable: code,
            ...rubriqueColumns(rubrique),
            createdBy: userId,
            updatedBy: userId,
          }),
        ),
      );
    });
  }

  async updateTable(
    code: string,
    input: TableInput,
    change: RubriquesChange,
    userId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        ParametreTableEntity,
        { codeTable: code },
        { ...tableColumns(input), updatedBy: userId },
      );
      if (change.supprimees.length > 0) {
        const supprimees = {
          codeTable: code,
          numRubrique: In(change.supprimees),
        };
        await manager.delete(ParametreEntity, supprimees);
        await manager.delete(ParametreRubriqueEntity, supprimees);
      }
      // Ordre croissant : un nouveau numéro n'est jamais supérieur à l'ancien
      // (suppressions seulement, ajouts en fin), il est donc déjà libéré.
      for (const rubrique of change.rubriques) {
        const ancien = Object.keys(change.renumerotation).find(
          (key) => change.renumerotation[key] === rubrique.num,
        );
        if (ancien === undefined) {
          await manager.save(
            manager.create(ParametreRubriqueEntity, {
              codeTable: code,
              ...rubriqueColumns(rubrique),
              createdBy: userId,
              updatedBy: userId,
            }),
          );
          continue;
        }
        if (ancien !== rubrique.num) {
          await manager.update(
            ParametreEntity,
            { codeTable: code, numRubrique: ancien },
            { numRubrique: rubrique.num },
          );
        }
        await manager.update(
          ParametreRubriqueEntity,
          { codeTable: code, numRubrique: ancien },
          { ...rubriqueColumns(rubrique), updatedBy: userId },
        );
      }
    });
  }

  async deleteTable(code: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(ParametreIntegriteEntity, { codeTable: code });
      await manager.delete(ParametreRubriqueEntity, { codeTable: code });
      await manager.delete(ParametreTableEntity, { codeTable: code });
    });
  }

  async longueurMaxCle(code: string): Promise<number> {
    const row = await this.parametres
      .createQueryBuilder('parametre')
      .select('MAX(LEN(parametre.cleParametre))', 'longueur')
      .where('parametre.codeTable = :code', { code })
      .getRawOne<{ longueur: number | null }>();
    return Number(row?.longueur ?? 0);
  }

  // --- Paramètres -----------------------------------------------------------

  async listParametres(code: string): Promise<Parametre[]> {
    const rows = await this.parametres.find({
      where: { codeTable: code },
      order: { cleParametre: 'ASC', numRubrique: 'ASC' },
    });
    return groupParametres(rows);
  }

  async findParametre(code: string, cle: string): Promise<Parametre | null> {
    const rows = await this.parametres.find({
      where: { codeTable: code, cleParametre: cle },
      order: { numRubrique: 'ASC' },
    });
    return groupParametres(rows)[0] ?? null;
  }

  async saveParametre(
    code: string,
    parametre: Parametre,
    userId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const rubriques = await manager.find(ParametreRubriqueEntity, {
        where: { codeTable: code },
      });
      const existantes = await manager.find(ParametreEntity, {
        where: { codeTable: code, cleParametre: parametre.cle },
      });
      for (const rubrique of rubriques) {
        const valeur = parametre.valeurs[rubrique.numRubrique] ?? '';
        const ligne = existantes.find(
          (candidate) => candidate.numRubrique === rubrique.numRubrique,
        );
        if (!valeur && rubrique.numRubrique !== RUBRIQUE_LIBELLE) {
          if (ligne) {
            await manager.delete(ParametreEntity, { id: ligne.id });
          }
          continue;
        }
        if (ligne) {
          await manager.update(
            ParametreEntity,
            { id: ligne.id },
            {
              zoneParametre: valeur,
              actif: parametre.actif,
              updatedBy: userId,
            },
          );
        } else {
          await manager.save(
            manager.create(ParametreEntity, {
              codeTable: code,
              cleParametre: parametre.cle,
              numRubrique: rubrique.numRubrique,
              zoneParametre: valeur,
              actif: parametre.actif,
              createdBy: userId,
              updatedBy: userId,
            }),
          );
        }
      }
    });
  }

  async deleteParametre(code: string, cle: string): Promise<void> {
    await this.parametres.delete({ codeTable: code, cleParametre: cle });
  }

  async countUtilisations(
    code: string,
    cle: string,
    libelle: string,
  ): Promise<number> {
    let total = 0;
    for (const usage of UTILISATIONS[code] ?? []) {
      const row = await this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'n')
        .from(usage.table, 't')
        .where(`t.${usage.colonne} = :valeur`, {
          valeur: usage.parLibelle ? libelle : cle,
        })
        .andWhere('t.deleted_at IS NULL')
        .getRawOne<{ n: number }>();
      total += Number(row?.n ?? 0);
    }
    return total;
  }

  /** Rubriques (avec nombre de valeurs) et nombre de clés de chaque table. */
  private async withDetails(
    tables: ParametreTableEntity[],
  ): Promise<TableParametres[]> {
    if (tables.length === 0) {
      return [];
    }
    const codes = tables.map((table) => table.codeTable);
    const rubriques = await this.rubriques.find({
      where: { codeTable: In(codes) },
      order: { numRubrique: 'ASC' },
    });
    const comptes = await this.parametres
      .createQueryBuilder('parametre')
      .select('parametre.codeTable', 'code')
      .addSelect('parametre.numRubrique', 'num')
      .addSelect('COUNT(*)', 'valeurs')
      .where('parametre.codeTable IN (:...codes)', { codes })
      .groupBy('parametre.codeTable')
      .addGroupBy('parametre.numRubrique')
      .getRawMany<{ code: string; num: string; valeurs: number }>();
    const cles = await this.parametres
      .createQueryBuilder('parametre')
      .select('parametre.codeTable', 'code')
      .addSelect('COUNT(DISTINCT parametre.cleParametre)', 'cles')
      .where('parametre.codeTable IN (:...codes)', { codes })
      .groupBy('parametre.codeTable')
      .getRawMany<{ code: string; cles: number }>();

    return tables.map((table) => ({
      code: table.codeTable,
      nom: table.nomTable,
      nomCle: table.nomCle,
      tailleCle: table.tailleCle,
      aide: table.aideTable,
      codeDansCombo: table.codeDansCombo,
      rubriques: rubriques
        .filter((rubrique) => rubrique.codeTable === table.codeTable)
        .map((rubrique) => ({
          num: rubrique.numRubrique,
          nom: rubrique.nomRubrique,
          aide: rubrique.aideRubrique,
          nbValeurs: Number(
            comptes.find(
              (compte) =>
                compte.code === table.codeTable &&
                compte.num === rubrique.numRubrique,
            )?.valeurs ?? 0,
          ),
        })),
      nbParametres: Number(
        cles.find((compte) => compte.code === table.codeTable)?.cles ?? 0,
      ),
    }));
  }
}

function tableColumns(input: TableInput): Partial<ParametreTableEntity> {
  return {
    nomTable: input.nom,
    nomCle: input.nomCle,
    tailleCle: input.tailleCle,
    aideTable: input.aide,
    codeDansCombo: input.codeDansCombo,
  };
}

function rubriqueColumns(rubrique: Rubrique): Partial<ParametreRubriqueEntity> {
  return {
    numRubrique: rubrique.num,
    nomRubrique: rubrique.nom,
    aideRubrique: rubrique.aide,
    formatRubrique: '',
  };
}

/** Lignes (une par clé et rubrique, triées par clé) → paramètres. */
function groupParametres(rows: ParametreEntity[]): Parametre[] {
  const parametres = new Map<string, Parametre>();
  for (const row of rows) {
    const parametre = parametres.get(row.cleParametre) ?? {
      cle: row.cleParametre,
      actif: row.actif,
      valeurs: {},
    };
    parametre.valeurs[row.numRubrique] = row.zoneParametre;
    if (row.numRubrique === RUBRIQUE_LIBELLE) {
      parametre.actif = row.actif;
    }
    parametres.set(row.cleParametre, parametre);
  }
  return [...parametres.values()];
}
