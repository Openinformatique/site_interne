import { MigrationInterface, QueryRunner } from 'typeorm';

export class ElargirPosteContact1793287151273 implements MigrationInterface {
  name = 'ElargirPosteContact1793287151273';

  // ALTER COLUMN plutôt que le DROP/ADD généré par TypeORM, qui effacerait
  // les postes existants.
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contacts" ALTER COLUMN "poste" nvarchar(50)`,
    );
  }

  // Échoue si un poste dépasse 20 caractères : c'est voulu, le retour
  // arrière ne doit pas tronquer de données.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contacts" ALTER COLUMN "poste" nvarchar(20)`,
    );
  }
}
