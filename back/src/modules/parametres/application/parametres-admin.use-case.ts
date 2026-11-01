import { Inject, Injectable } from '@nestjs/common';
import {
  ResourceNotFoundException,
  ValidationException,
} from '../../../common/exceptions/app-exceptions';
import { PARAMETRE_ADMIN } from '../domain/parametre-admin.port';
import type {
  Parametre,
  ParametreAdminPort,
  Rubrique,
  RubriquesChange,
  TableInput,
  TableParametres,
} from '../domain/parametre-admin.port';

/** Rubrique portant le libellé affiché dans les listes. */
const RUBRIQUE_LIBELLE = '01';
const CODE_TABLE = /^[A-Z0-9]{4}$/;

const num = (index: number) => String(index + 1).padStart(2, '0');

/**
 * Cas d'utilisation : administration du paramétrage (écran « Paramètres ») —
 * tables, rubriques et paramètres (PARTAB / PARRUB / PARFIC historiques).
 *
 * Règles : code de table unique (4 caractères, majuscules), figé ; rubrique
 * 01 (libellé) obligatoire et non supprimable ; une table ne se supprime que
 * vide ; une clé est unique dans sa table, sans espace, limitée à la taille
 * de clé et figée ; un paramètre utilisé ailleurs ne se supprime pas (on le
 * désactive).
 */
@Injectable()
export class ParametresAdminUseCase {
  constructor(
    @Inject(PARAMETRE_ADMIN) private readonly admin: ParametreAdminPort,
  ) {}

  listTables(): Promise<TableParametres[]> {
    return this.admin.listTables();
  }

  async createTable(
    code: string,
    input: TableInput,
    userId: string,
  ): Promise<TableParametres> {
    const normalized = code.trim().toUpperCase();
    if (!CODE_TABLE.test(normalized)) {
      throw invalid('code', '4 lettres ou chiffres.');
    }
    if (await this.admin.findTable(normalized)) {
      throw invalid('code', 'Ce code de table est déjà utilisé.');
    }
    const rubriques: Rubrique[] = input.rubriques.map((rubrique, index) => ({
      num: num(index),
      nom: rubrique.nom,
      aide: rubrique.aide,
    }));
    await this.admin.createTable(normalized, input, rubriques, userId);
    return this.getTable(normalized);
  }

  async updateTable(
    code: string,
    input: TableInput,
    userId: string,
  ): Promise<TableParametres> {
    const table = await this.getTable(code);
    if (input.rubriques[0]?.ancienNum !== RUBRIQUE_LIBELLE) {
      throw invalid(
        'rubriques',
        'La rubrique 01 (libellé) ne peut pas être supprimée.',
      );
    }
    const existantes = new Set(table.rubriques.map((rubrique) => rubrique.num));
    const conservees = input.rubriques
      .map((rubrique) => rubrique.ancienNum)
      .filter((ancien): ancien is string => ancien !== null);
    if (
      conservees.some((ancien) => !existantes.has(ancien)) ||
      new Set(conservees).size !== conservees.length
    ) {
      throw invalid('rubriques', 'Rubrique inconnue.');
    }
    if (input.tailleCle < (await this.admin.longueurMaxCle(table.code))) {
      throw invalid(
        'tailleCle',
        'Des clés existantes sont plus longues que cette taille.',
      );
    }

    const change: RubriquesChange = {
      rubriques: input.rubriques.map((rubrique, index) => ({
        num: num(index),
        nom: rubrique.nom,
        aide: rubrique.aide,
      })),
      renumerotation: Object.fromEntries(
        input.rubriques.flatMap((rubrique, index) =>
          rubrique.ancienNum ? [[rubrique.ancienNum, num(index)]] : [],
        ),
      ),
      supprimees: [...existantes].filter(
        (ancien) => !conservees.includes(ancien),
      ),
    };
    await this.admin.updateTable(table.code, input, change, userId);
    return this.getTable(table.code);
  }

  async deleteTable(code: string): Promise<void> {
    const table = await this.getTable(code);
    if (table.nbParametres > 0) {
      throw invalid(
        'code',
        'Cette table contient des paramètres : supprimez-les ou désactivez-les d’abord.',
      );
    }
    await this.admin.deleteTable(table.code);
  }

  async listParametres(code: string): Promise<Parametre[]> {
    const table = await this.getTable(code);
    return this.admin.listParametres(table.code);
  }

  async createParametre(
    code: string,
    parametre: Parametre,
    userId: string,
  ): Promise<Parametre> {
    const table = await this.getTable(code);
    const cle = parametre.cle.trim();
    if (!cle || /\s/.test(cle)) {
      throw invalid('cle', 'Clé obligatoire, sans espace.');
    }
    if (cle.length > table.tailleCle) {
      throw invalid('cle', `${table.tailleCle} caractères maximum.`);
    }
    if (await this.admin.findParametre(table.code, cle)) {
      throw invalid('cle', 'Cette clé existe déjà dans la table.');
    }
    return this.save(table, { ...parametre, cle }, userId);
  }

  async updateParametre(
    code: string,
    cle: string,
    parametre: Omit<Parametre, 'cle'>,
    userId: string,
  ): Promise<Parametre> {
    const table = await this.getTable(code);
    await this.getParametre(table.code, cle);
    return this.save(table, { ...parametre, cle }, userId);
  }

  async deleteParametre(code: string, cle: string): Promise<void> {
    const table = await this.getTable(code);
    const parametre = await this.getParametre(table.code, cle);
    const utilisations = await this.admin.countUtilisations(
      table.code,
      cle,
      parametre.valeurs[RUBRIQUE_LIBELLE] ?? '',
    );
    if (utilisations > 0) {
      throw invalid(
        'cle',
        `Ce paramètre est utilisé (${utilisations} enregistrement${utilisations > 1 ? 's' : ''}) : désactivez-le plutôt.`,
      );
    }
    await this.admin.deleteParametre(table.code, cle);
  }

  private async save(
    table: TableParametres,
    parametre: Parametre,
    userId: string,
  ): Promise<Parametre> {
    const nums = new Set(table.rubriques.map((rubrique) => rubrique.num));
    if (Object.keys(parametre.valeurs).some((key) => !nums.has(key))) {
      throw invalid('valeurs', 'Rubrique inconnue.');
    }
    const valeurs = Object.fromEntries(
      Object.entries(parametre.valeurs).map(([key, value]) => [
        key,
        value.trim(),
      ]),
    );
    const tropLongue = Object.keys(valeurs).find(
      (key) => (valeurs[key] ?? '').length > 80,
    );
    if (tropLongue) {
      throw invalid(`valeurs.${tropLongue}`, '80 caractères maximum.');
    }
    if (!valeurs[RUBRIQUE_LIBELLE]) {
      throw invalid(`valeurs.${RUBRIQUE_LIBELLE}`, 'Champ obligatoire.');
    }
    await this.admin.saveParametre(
      table.code,
      { ...parametre, valeurs },
      userId,
    );
    return this.getParametre(table.code, parametre.cle);
  }

  private async getTable(code: string): Promise<TableParametres> {
    const table = await this.admin.findTable(code.toUpperCase());
    if (!table) {
      throw new ResourceNotFoundException('La table de paramètres');
    }
    return table;
  }

  private async getParametre(code: string, cle: string): Promise<Parametre> {
    const parametre = await this.admin.findParametre(code, cle);
    if (!parametre) {
      throw new ResourceNotFoundException('Le paramètre');
    }
    return parametre;
  }
}

function invalid(field: string, message: string): ValidationException {
  return new ValidationException([{ field, message }]);
}
