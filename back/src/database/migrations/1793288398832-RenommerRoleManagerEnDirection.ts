import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Renomme le rôle MANAGER en DIRECTION (mêmes droits) : les utilisateurs
 * existants sont convertis.
 */
export class RenommerRoleManagerEnDirection1793288398832 implements MigrationInterface {
  name = 'RenommerRoleManagerEnDirection1793288398832';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "users" SET "role" = 'DIRECTION' WHERE "role" = 'MANAGER'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "users" SET "role" = 'MANAGER' WHERE "role" = 'DIRECTION'`,
    );
  }
}
