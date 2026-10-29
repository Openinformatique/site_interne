import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSchemaMetier1793284748848 implements MigrationInterface {
  name = 'CreateSchemaMetier1793284748848';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "clients" ("created_at" datetime2 NOT NULL CONSTRAINT "DF_d18f039057f824490daaad22d4a" DEFAULT getdate(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_fb1851e6bfc261a67bee46b07dd" DEFAULT getdate(), "deleted_at" datetime2, "created_by" uniqueidentifier, "updated_by" uniqueidentifier, "id" int NOT NULL IDENTITY(1,1), "code_client" nvarchar(15), "raison_sociale" nvarchar(50), "actif" bit NOT NULL CONSTRAINT "DF_e338959134f276ddd95aabc8c7e" DEFAULT 1, "adresse1" nvarchar(35), "adresse2" nvarchar(35), "adresse3" nvarchar(35), "code_postal" nvarchar(6), "ville" nvarchar(30), "code_pays" nvarchar(3), "numero_tva" nvarchar(16), "mode_reglement" nvarchar(20), "groupe" nvarchar(20), CONSTRAINT "PK_f1ab7cf3a5714dbc6bb4e1c28a4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_clients_code_client" ON "clients" ("code_client") `,
    );
    await queryRunner.query(
      `CREATE TABLE "client_contrats" ("created_at" datetime2 NOT NULL CONSTRAINT "DF_98eaed8f1fa0838d17be0370060" DEFAULT getdate(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_31defa36a5522bf89d04181bcd1" DEFAULT getdate(), "deleted_at" datetime2, "created_by" uniqueidentifier, "updated_by" uniqueidentifier, "id" int NOT NULL IDENTITY(1,1), "libelle_contrat" nvarchar(250), "date_mise_en_place" date, "date_echeance" date, "client_id" int NOT NULL, CONSTRAINT "UQ_client_contrats_id_client_id" UNIQUE ("id", "client_id"), CONSTRAINT "PK_b9602a360d534e53cb5959381a9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_client_contrats_client_id" ON "client_contrats" ("client_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "contacts" ("created_at" datetime2 NOT NULL CONSTRAINT "DF_ec4f69b757fb905b908d0e66073" DEFAULT getdate(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_7e3d0339c97c4c67d2434296acc" DEFAULT getdate(), "deleted_at" datetime2, "created_by" uniqueidentifier, "updated_by" uniqueidentifier, "id" int NOT NULL IDENTITY(1,1), "nom_contact" nvarchar(100), "civilite" int, "adresse_email" nvarchar(255), "numero_telephone" nvarchar(50), "client_id" int NOT NULL, "actif" bit NOT NULL CONSTRAINT "DF_a146f8d9b567ae073c6e6b74771" DEFAULT 1, "poste" nvarchar(20), CONSTRAINT "PK_b99cd40cfd66a99f1571f4f72e6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_contacts_client_id" ON "contacts" ("client_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "commandes" ("created_at" datetime2 NOT NULL CONSTRAINT "DF_7801682f9aa73b99fbf37334228" DEFAULT getdate(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_b2bdf020c15b053bbb6e2d8c3f1" DEFAULT getdate(), "deleted_at" datetime2, "created_by" uniqueidentifier, "updated_by" uniqueidentifier, "id" int NOT NULL IDENTITY(1,1), "client_id" int NOT NULL, "client_contrat_id" int NOT NULL, "numero_devis" nvarchar(10), "date_devis" date, "numero_commande_client" nvarchar(20), "date_commande" date, "libelle_commande" nvarchar(MAX), "nb_jours_commande" decimal(7,2), "nb_jours_prevus" decimal(7,2), "delai" date, "montant" decimal(18,2), "date_cloture" date, "type_commande" nvarchar(20), CONSTRAINT "PK_048c7aef9a99d4aed24c9054893" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_commandes_client_id" ON "commandes" ("client_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_commandes_client_contrat_id" ON "commandes" ("client_contrat_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "commande_repartitions" ("created_at" datetime2 NOT NULL CONSTRAINT "DF_215041ff1c31f473a7df601fdcc" DEFAULT getdate(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_818078496af1239dd59451b514e" DEFAULT getdate(), "deleted_at" datetime2, "created_by" uniqueidentifier, "updated_by" uniqueidentifier, "id" int NOT NULL IDENTITY(1,1), "nb_jours" decimal(5,2), "commande_id" int NOT NULL, "utilisateur_id" uniqueidentifier, CONSTRAINT "PK_80d5f18828a7a30a9ab85e87b38" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_commande_repartitions_commande_id" ON "commande_repartitions" ("commande_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_commande_repartitions_utilisateur_id" ON "commande_repartitions" ("utilisateur_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "documents_commande" ("created_at" datetime2 NOT NULL CONSTRAINT "DF_c8e6a301e12ce30322fa9a1900e" DEFAULT getdate(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_5269c77254006060ef57075e755" DEFAULT getdate(), "deleted_at" datetime2, "created_by" uniqueidentifier, "updated_by" uniqueidentifier, "id" int NOT NULL IDENTITY(1,1), "type_document" nvarchar(20), "nom_fichier" nvarchar(250), "commentaire" nvarchar(100), "fichier_identifiant" nvarchar(100) NOT NULL, "type_mime" nvarchar(255) NOT NULL, "taille_octets" bigint NOT NULL, "commande_id" int NOT NULL, CONSTRAINT "PK_83c49da11d758b6edc334b64c33" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_documents_commande_commande_id" ON "documents_commande" ("commande_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "parametres_tables" ("created_at" datetime2 NOT NULL CONSTRAINT "DF_b8aed002010aa835b407164fdd3" DEFAULT getdate(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_5336d37925e55b1253efa0808cf" DEFAULT getdate(), "deleted_at" datetime2, "created_by" uniqueidentifier, "updated_by" uniqueidentifier, "id" int NOT NULL IDENTITY(1,1), "code_table" nvarchar(4) NOT NULL, "nom_table" nvarchar(40) NOT NULL, "nom_cle" nvarchar(20) NOT NULL, "taille_cle" smallint NOT NULL, "aide_table" nvarchar(255) NOT NULL, "modifiable_super" smallint NOT NULL, "code_dans_combo" bit NOT NULL, CONSTRAINT "PK_082931c793032846c59e162e0e0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_parametres_tables_code_table" ON "parametres_tables" ("code_table") `,
    );
    await queryRunner.query(
      `CREATE TABLE "parametres_rubriques" ("created_at" datetime2 NOT NULL CONSTRAINT "DF_6cf76bbfd27a5bf0fedd315023e" DEFAULT getdate(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_283b5d1ebebb715a8275d573469" DEFAULT getdate(), "deleted_at" datetime2, "created_by" uniqueidentifier, "updated_by" uniqueidentifier, "id" int NOT NULL IDENTITY(1,1), "code_table" nvarchar(4) NOT NULL, "num_rubrique" nvarchar(2) NOT NULL, "nom_rubrique" nvarchar(40) NOT NULL, "format_rubrique" nvarchar(20) NOT NULL, "aide_rubrique" nvarchar(255) NOT NULL, CONSTRAINT "PK_49d07d25b99c340e3f824b3683b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_parametres_rubriques_code_table" ON "parametres_rubriques" ("code_table") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_parametres_rubriques_code_table_num_rubrique" ON "parametres_rubriques" ("code_table", "num_rubrique") `,
    );
    await queryRunner.query(
      `CREATE TABLE "parametres_integrite" ("created_at" datetime2 NOT NULL CONSTRAINT "DF_87e677b6d2a30b58acb37fe1263" DEFAULT getdate(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_0f6d3cdd779fd58e16ee3a0c298" DEFAULT getdate(), "deleted_at" datetime2, "created_by" uniqueidentifier, "updated_by" uniqueidentifier, "id" int NOT NULL IDENTITY(1,1), "code_table" nvarchar(4) NOT NULL, "rubrique_fichier" nvarchar(50) NOT NULL, CONSTRAINT "PK_7069319795f39904b90ec958781" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_parametres_integrite_code_table" ON "parametres_integrite" ("code_table") `,
    );
    await queryRunner.query(
      `CREATE TABLE "parametres" ("created_at" datetime2 NOT NULL CONSTRAINT "DF_1c3ca0a6af7523f44ba8486e563" DEFAULT getdate(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_556d784b53b00e8a696bf1a6c3b" DEFAULT getdate(), "deleted_at" datetime2, "created_by" uniqueidentifier, "updated_by" uniqueidentifier, "id" int NOT NULL IDENTITY(1,1), "code_table" nvarchar(4) NOT NULL, "cle_parametre" nvarchar(8) NOT NULL, "num_rubrique" nvarchar(2) NOT NULL, "zone_parametre" nvarchar(80) NOT NULL, "actif" bit NOT NULL CONSTRAINT "DF_8ce21509b2fcb07cfc498568029" DEFAULT 1, CONSTRAINT "PK_a0fe17264637cc7d62331dad21f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_parametres_code_table_num_rubrique" ON "parametres" ("code_table", "num_rubrique") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_parametres_code_table_cle_parametre_num_rubrique" ON "parametres" ("code_table", "cle_parametre", "num_rubrique") `,
    );
    await queryRunner.query(
      `CREATE TABLE "pointages" ("created_at" datetime2 NOT NULL CONSTRAINT "DF_2f00eb9f279d090e3f523b2cb90" DEFAULT getdate(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_42a88b35e1203246b048acbba24" DEFAULT getdate(), "deleted_at" datetime2, "created_by" uniqueidentifier, "updated_by" uniqueidentifier, "id" int NOT NULL IDENTITY(1,1), "utilisateur_id" uniqueidentifier, "date_heure_debut" datetime2, "date_heure_fin" datetime2, "client_id" int, "commande_id" int, "contact_id" int, "description" nvarchar(MAX), "type_action" nvarchar(20), "facturable" bit NOT NULL CONSTRAINT "DF_5ef1015eb1f4cb552fc7c783c9d" DEFAULT 0, "temps_facturable" decimal(9,2), CONSTRAINT "PK_d1937d95f8811cfe5e4748ce20e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_pointages_utilisateur_id" ON "pointages" ("utilisateur_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_pointages_client_id" ON "pointages" ("client_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_pointages_commande_id" ON "pointages" ("commande_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_pointages_contact_id" ON "pointages" ("contact_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "client_contrats" ADD CONSTRAINT "FK_01f8aff0433129c4e703865a9dc" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contacts" ADD CONSTRAINT "FK_72d1013c43a0198e905290831e5" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "commandes" ADD CONSTRAINT "FK_52627ef53b2b96fe3aa1e6cf0ef" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "commandes" ADD CONSTRAINT "FK_92965d7157e9e33041bd895b684" FOREIGN KEY ("client_contrat_id", "client_id") REFERENCES "client_contrats"("id","client_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "commande_repartitions" ADD CONSTRAINT "FK_9456929bb3bcaba41d65859ac8e" FOREIGN KEY ("commande_id") REFERENCES "commandes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "commande_repartitions" ADD CONSTRAINT "FK_c90f0075a5e0d0ca8f9b7aff013" FOREIGN KEY ("utilisateur_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents_commande" ADD CONSTRAINT "FK_6a13aead87e0268778716173e22" FOREIGN KEY ("commande_id") REFERENCES "commandes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "parametres_rubriques" ADD CONSTRAINT "FK_f9e76a6d2ac117b0d3a0c795d0a" FOREIGN KEY ("code_table") REFERENCES "parametres_tables"("code_table") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "parametres_integrite" ADD CONSTRAINT "FK_6bbc80f4068627b66b1f005214e" FOREIGN KEY ("code_table") REFERENCES "parametres_tables"("code_table") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "parametres" ADD CONSTRAINT "FK_15b60cdf6c9227f4461e24c5389" FOREIGN KEY ("code_table") REFERENCES "parametres_tables"("code_table") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pointages" ADD CONSTRAINT "FK_d5776065449ee411a734c8be938" FOREIGN KEY ("utilisateur_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pointages" ADD CONSTRAINT "FK_0a863fc71e94afe7f6a02f02ebe" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pointages" ADD CONSTRAINT "FK_3e409f6bd2dea5ab07ee95b053e" FOREIGN KEY ("commande_id") REFERENCES "commandes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pointages" ADD CONSTRAINT "FK_707f8d708db31491590f71abf3e" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pointages" DROP CONSTRAINT "FK_707f8d708db31491590f71abf3e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pointages" DROP CONSTRAINT "FK_3e409f6bd2dea5ab07ee95b053e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pointages" DROP CONSTRAINT "FK_0a863fc71e94afe7f6a02f02ebe"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pointages" DROP CONSTRAINT "FK_d5776065449ee411a734c8be938"`,
    );
    await queryRunner.query(
      `ALTER TABLE "parametres" DROP CONSTRAINT "FK_15b60cdf6c9227f4461e24c5389"`,
    );
    await queryRunner.query(
      `ALTER TABLE "parametres_integrite" DROP CONSTRAINT "FK_6bbc80f4068627b66b1f005214e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "parametres_rubriques" DROP CONSTRAINT "FK_f9e76a6d2ac117b0d3a0c795d0a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents_commande" DROP CONSTRAINT "FK_6a13aead87e0268778716173e22"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commande_repartitions" DROP CONSTRAINT "FK_c90f0075a5e0d0ca8f9b7aff013"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commande_repartitions" DROP CONSTRAINT "FK_9456929bb3bcaba41d65859ac8e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commandes" DROP CONSTRAINT "FK_92965d7157e9e33041bd895b684"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commandes" DROP CONSTRAINT "FK_52627ef53b2b96fe3aa1e6cf0ef"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contacts" DROP CONSTRAINT "FK_72d1013c43a0198e905290831e5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_contrats" DROP CONSTRAINT "FK_01f8aff0433129c4e703865a9dc"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_pointages_contact_id" ON "pointages"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_pointages_commande_id" ON "pointages"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_pointages_client_id" ON "pointages"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_pointages_utilisateur_id" ON "pointages"`,
    );
    await queryRunner.query(`DROP TABLE "pointages"`);
    await queryRunner.query(
      `DROP INDEX "UQ_parametres_code_table_cle_parametre_num_rubrique" ON "parametres"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_parametres_code_table_num_rubrique" ON "parametres"`,
    );
    await queryRunner.query(`DROP TABLE "parametres"`);
    await queryRunner.query(
      `DROP INDEX "IDX_parametres_integrite_code_table" ON "parametres_integrite"`,
    );
    await queryRunner.query(`DROP TABLE "parametres_integrite"`);
    await queryRunner.query(
      `DROP INDEX "UQ_parametres_rubriques_code_table_num_rubrique" ON "parametres_rubriques"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_parametres_rubriques_code_table" ON "parametres_rubriques"`,
    );
    await queryRunner.query(`DROP TABLE "parametres_rubriques"`);
    await queryRunner.query(
      `DROP INDEX "UQ_parametres_tables_code_table" ON "parametres_tables"`,
    );
    await queryRunner.query(`DROP TABLE "parametres_tables"`);
    await queryRunner.query(
      `DROP INDEX "IDX_documents_commande_commande_id" ON "documents_commande"`,
    );
    await queryRunner.query(`DROP TABLE "documents_commande"`);
    await queryRunner.query(
      `DROP INDEX "IDX_commande_repartitions_utilisateur_id" ON "commande_repartitions"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_commande_repartitions_commande_id" ON "commande_repartitions"`,
    );
    await queryRunner.query(`DROP TABLE "commande_repartitions"`);
    await queryRunner.query(
      `DROP INDEX "IDX_commandes_client_contrat_id" ON "commandes"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_commandes_client_id" ON "commandes"`,
    );
    await queryRunner.query(`DROP TABLE "commandes"`);
    await queryRunner.query(
      `DROP INDEX "IDX_contacts_client_id" ON "contacts"`,
    );
    await queryRunner.query(`DROP TABLE "contacts"`);
    await queryRunner.query(
      `DROP INDEX "IDX_client_contrats_client_id" ON "client_contrats"`,
    );
    await queryRunner.query(`DROP TABLE "client_contrats"`);
    await queryRunner.query(
      `DROP INDEX "IDX_clients_code_client" ON "clients"`,
    );
    await queryRunner.query(`DROP TABLE "clients"`);
  }
}
