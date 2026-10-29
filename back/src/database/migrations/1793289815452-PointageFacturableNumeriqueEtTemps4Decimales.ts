import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * pointages.facturable : bit -> smallint (l'application historique utilise
 * les codes 0, 1, 3 et 4) ; temps_facturable : 4 décimales.
 *
 * ALTER COLUMN plutôt que le DROP/ADD généré par TypeORM, qui effacerait
 * les valeurs existantes. La contrainte de défaut doit être retirée puis
 * recréée autour de la modification.
 */
export class PointageFacturableNumeriqueEtTemps4Decimales1793289815452 implements MigrationInterface {
  name = 'PointageFacturableNumeriqueEtTemps4Decimales1793289815452';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pointages" DROP CONSTRAINT "DF_5ef1015eb1f4cb552fc7c783c9d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pointages" ALTER COLUMN "facturable" smallint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "pointages" ADD CONSTRAINT "DF_5ef1015eb1f4cb552fc7c783c9d" DEFAULT 0 FOR "facturable"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pointages" ALTER COLUMN "temps_facturable" decimal(9,4)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Le retour en bit écraserait silencieusement les codes 3 et 4 en 1 :
    // on refuse plutôt que de perdre de l'information.
    await queryRunner.query(
      `IF EXISTS (SELECT 1 FROM "pointages" WHERE "facturable" NOT IN (0, 1)) THROW 50000, 'Des pointages ont un code facturable autre que 0/1 : retour arrière impossible sans perte.', 1`,
    );
    await queryRunner.query(
      `ALTER TABLE "pointages" ALTER COLUMN "temps_facturable" decimal(9,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "pointages" DROP CONSTRAINT "DF_5ef1015eb1f4cb552fc7c783c9d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pointages" ALTER COLUMN "facturable" bit NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "pointages" ADD CONSTRAINT "DF_5ef1015eb1f4cb552fc7c783c9d" DEFAULT 0 FOR "facturable"`,
    );
  }
}
