import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { IdentityAuditableEntity } from '../../../../common/entities/identity-auditable.entity';
import { ClientContratEntity } from '../../../clients/infrastructure/entities/client-contrat.entity';
import { ClientEntity } from '../../../clients/infrastructure/entities/client.entity';

/**
 * Entité TypeORM de la table `commandes`.
 *
 * Reprise de la table `Commande` de l'application historique. Le contrat
 * est facultatif (commandes et devis hors contrat). Lorsqu'il est
 * renseigné, sa cohérence avec `client_id` est garantie par la clé
 * étrangère composite
 * (client_contrat_id, client_id) → client_contrats (id, client_id).
 *
 * Les jours ont 4 décimales : l'application historique y stocke des
 * heures converties en jours (ex. : 0,5 h = 0,0625 j).
 * Les colonnes decimal sont renvoyées en chaîne par le driver mssql.
 */
@Entity({ name: 'commandes' })
export class CommandeEntity extends IdentityAuditableEntity {
  @Index('IDX_commandes_client_id')
  @Column({ name: 'client_id', type: 'int' })
  clientId!: number;

  @ManyToOne(() => ClientEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'client_id' })
  client?: ClientEntity;

  @Index('IDX_commandes_client_contrat_id')
  @Column({ name: 'client_contrat_id', type: 'int', nullable: true })
  clientContratId!: number | null;

  @ManyToOne(() => ClientContratEntity, { onDelete: 'NO ACTION' })
  @JoinColumn([
    { name: 'client_contrat_id', referencedColumnName: 'id' },
    { name: 'client_id', referencedColumnName: 'clientId' },
  ])
  clientContrat?: ClientContratEntity;

  @Column({
    name: 'numero_devis',
    type: 'nvarchar',
    length: 10,
    nullable: true,
  })
  numeroDevis!: string | null;

  @Column({ name: 'date_devis', type: 'date', nullable: true })
  dateDevis!: string | null;

  @Column({
    name: 'numero_commande_client',
    type: 'nvarchar',
    length: 20,
    nullable: true,
  })
  numeroCommandeClient!: string | null;

  @Column({ name: 'date_commande', type: 'date', nullable: true })
  dateCommande!: string | null;

  @Column({
    name: 'libelle_commande',
    type: 'nvarchar',
    length: 'MAX',
    nullable: true,
  })
  libelleCommande!: string | null;

  /** Nombre de jours vendus. */
  @Column({
    name: 'nb_jours_commande',
    type: 'decimal',
    precision: 9,
    scale: 4,
    nullable: true,
  })
  nbJoursCommande!: string | null;

  /** Nombre de jours estimés. */
  @Column({
    name: 'nb_jours_prevus',
    type: 'decimal',
    precision: 9,
    scale: 4,
    nullable: true,
  })
  nbJoursPrevus!: string | null;

  /** Date de livraison prévue. */
  @Column({ name: 'delai', type: 'date', nullable: true })
  delai!: string | null;

  @Column({
    name: 'montant',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  montant!: string | null;

  @Column({ name: 'date_cloture', type: 'date', nullable: true })
  dateCloture!: string | null;

  /** Clé de paramètre. */
  @Column({
    name: 'type_commande',
    type: 'nvarchar',
    length: 20,
    nullable: true,
  })
  typeCommande!: string | null;
}
