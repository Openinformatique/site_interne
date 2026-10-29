import { Column, Entity, Index } from 'typeorm';
import { IdentityAuditableEntity } from '../../../../common/entities/identity-auditable.entity';

/**
 * Entité TypeORM de la table `clients`.
 *
 * Reprise de la table `Client` de l'application historique (HFSQL).
 * `actif` (ex-`Enr_Actif`) est distinct de la suppression logique : un
 * client inactif reste consultable mais ne doit plus être proposé à la
 * saisie.
 *
 * `mode_reglement` et `groupe` contiennent une clé de paramètre
 * (voir module parametres).
 */
@Entity({ name: 'clients' })
export class ClientEntity extends IdentityAuditableEntity {
  @Index('IDX_clients_code_client')
  @Column({ name: 'code_client', type: 'nvarchar', length: 15, nullable: true })
  codeClient!: string | null;

  @Column({
    name: 'raison_sociale',
    type: 'nvarchar',
    length: 50,
    nullable: true,
  })
  raisonSociale!: string | null;

  @Column({ name: 'actif', type: 'bit', default: true })
  actif!: boolean;

  @Column({ name: 'adresse1', type: 'nvarchar', length: 35, nullable: true })
  adresse1!: string | null;

  @Column({ name: 'adresse2', type: 'nvarchar', length: 35, nullable: true })
  adresse2!: string | null;

  @Column({ name: 'adresse3', type: 'nvarchar', length: 35, nullable: true })
  adresse3!: string | null;

  @Column({ name: 'code_postal', type: 'nvarchar', length: 6, nullable: true })
  codePostal!: string | null;

  @Column({ name: 'ville', type: 'nvarchar', length: 30, nullable: true })
  ville!: string | null;

  @Column({ name: 'code_pays', type: 'nvarchar', length: 3, nullable: true })
  codePays!: string | null;

  /** Numéro de TVA intracommunautaire (ex-`ID_TVA`). */
  @Column({ name: 'numero_tva', type: 'nvarchar', length: 16, nullable: true })
  numeroTva!: string | null;

  @Column({
    name: 'mode_reglement',
    type: 'nvarchar',
    length: 20,
    nullable: true,
  })
  modeReglement!: string | null;

  @Column({ name: 'groupe', type: 'nvarchar', length: 20, nullable: true })
  groupe!: string | null;
}
