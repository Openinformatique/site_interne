import { MigrationInterface, QueryRunner } from 'typeorm';

export class AjouterLoginUtilisateur1793288398831 implements MigrationInterface {
  name = 'AjouterLoginUtilisateur1793288398831';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "login" nvarchar(50)`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_login" ON "users" ("login") WHERE "login" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_users_login" ON "users"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "login"`);
  }
}
