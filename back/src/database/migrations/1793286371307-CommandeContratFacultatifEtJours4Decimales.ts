import { MigrationInterface, QueryRunner } from 'typeorm';

export class CommandeContratFacultatifEtJours4Decimales1793286371307 implements MigrationInterface {
  name = 'CommandeContratFacultatifEtJours4Decimales1793286371307';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "commandes" DROP CONSTRAINT "FK_92965d7157e9e33041bd895b684"`,
    );
    // SQL Server refuse ALTER COLUMN sur une colonne indexée : l'index est
    // supprimé puis recréé autour de la modification.
    await queryRunner.query(
      `DROP INDEX "IDX_commandes_client_contrat_id" ON "commandes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commandes" ALTER COLUMN "client_contrat_id" int`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_commandes_client_contrat_id" ON "commandes" ("client_contrat_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "commandes" ALTER COLUMN "nb_jours_commande" decimal(9,4)`,
    );
    await queryRunner.query(
      `ALTER TABLE "commandes" ALTER COLUMN "nb_jours_prevus" decimal(9,4)`,
    );
    await queryRunner.query(
      `ALTER TABLE "commande_repartitions" ALTER COLUMN "nb_jours" decimal(9,4)`,
    );
    await queryRunner.query(
      `ALTER TABLE "commandes" ADD CONSTRAINT "FK_92965d7157e9e33041bd895b684" FOREIGN KEY ("client_contrat_id", "client_id") REFERENCES "client_contrats"("id","client_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "commandes" DROP CONSTRAINT "FK_92965d7157e9e33041bd895b684"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commande_repartitions" ALTER COLUMN "nb_jours" decimal(5,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "commandes" ALTER COLUMN "nb_jours_prevus" decimal(7,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "commandes" ALTER COLUMN "nb_jours_commande" decimal(7,2)`,
    );
    // Échoue si des commandes sans contrat existent : c'est voulu, le
    // retour arrière ne doit pas inventer de contrat.
    await queryRunner.query(
      `DROP INDEX "IDX_commandes_client_contrat_id" ON "commandes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commandes" ALTER COLUMN "client_contrat_id" int NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_commandes_client_contrat_id" ON "commandes" ("client_contrat_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "commandes" ADD CONSTRAINT "FK_92965d7157e9e33041bd895b684" FOREIGN KEY ("client_contrat_id", "client_id") REFERENCES "client_contrats"("id","client_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
