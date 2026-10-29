import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ajoute le rôle applicatif à la table users.
 *
 * Les lignes existantes reçoivent le rôle par défaut USER ; les rôles des
 * utilisateurs techniques semés (admin@local.dev → ADMIN) sont alignés par
 * le seeder, pas par cette migration (le schéma reste indépendant des
 * données de démonstration).
 */
export class AddRoleToUsersTable1788134400000 implements MigrationInterface {
  name = 'AddRoleToUsersTable1788134400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "role" nvarchar(30) NOT NULL CONSTRAINT "DF_users_role" DEFAULT 'USER'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "DF_users_role"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
  }
}
