import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Colonnes techniques communes aux entités TypeORM modifiables.
 *
 * Dates techniques et traçabilité créateur/modificateur, sans clé
 * primaire : la nature de l'identifiant (UUID ou entier) est choisie par
 * la classe fille (voir AuditableEntity et IdentityAuditableEntity).
 * Toutes les dates sont stockées en datetime2 et interprétées en UTC.
 *
 * `createdBy` / `updatedBy` sont de simples UUID nullable : aucune
 * relation TypeORM vers `users` n'est imposée, afin de ne pas coupler
 * toutes les entités au module utilisateurs.
 */
export abstract class AuditColumnsEntity {
  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt!: Date;

  /** Suppression logique : géré par TypeORM (softDelete / restore). */
  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime2', nullable: true })
  deletedAt!: Date | null;

  /** UUID de l'utilisateur créateur, si connu. */
  @Column({ name: 'created_by', type: 'uniqueidentifier', nullable: true })
  createdBy!: string | null;

  /** UUID du dernier utilisateur modificateur, si connu. */
  @Column({ name: 'updated_by', type: 'uniqueidentifier', nullable: true })
  updatedBy!: string | null;
}
