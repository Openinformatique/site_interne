import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Passe le modèle de rôles de deux valeurs (ADMIN/USER) à trois
 * (ADMIN/MANAGER/EMPLOYEE) : les anciens USER deviennent EMPLOYEE et le
 * défaut de colonne est aligné.
 */
export class UpdateUserRoleValues1788220800000 implements MigrationInterface {
  name = 'UpdateUserRoleValues1788220800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "users" SET "role" = 'EMPLOYEE' WHERE "role" = 'USER'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "DF_users_role"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "DF_users_role" DEFAULT 'EMPLOYEE' FOR "role"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "users" SET "role" = 'USER' WHERE "role" IN ('EMPLOYEE', 'MANAGER')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "DF_users_role"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "DF_users_role" DEFAULT 'USER' FOR "role"`,
    );
  }
}
