import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { IdentityAuditableEntity } from '../../../../common/entities/identity-auditable.entity';
import { UserEntity } from '../../../users/infrastructure/entities/user.entity';
import { CommandeEntity } from './commande.entity';

/**
 * Entité TypeORM de la table `commande_repartitions`.
 *
 * Reprise de la table `Commande_repartition` : nombre de jours d'une
 * commande attribués à un salarié.
 */
@Entity({ name: 'commande_repartitions' })
export class CommandeRepartitionEntity extends IdentityAuditableEntity {
  @Column({
    name: 'nb_jours',
    type: 'decimal',
    precision: 9,
    scale: 4,
    nullable: true,
  })
  nbJours!: string | null;

  @Index('IDX_commande_repartitions_commande_id')
  @Column({ name: 'commande_id', type: 'int' })
  commandeId!: number;

  @ManyToOne(() => CommandeEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'commande_id' })
  commande?: CommandeEntity;

  @Index('IDX_commande_repartitions_utilisateur_id')
  @Column({ name: 'utilisateur_id', type: 'uniqueidentifier', nullable: true })
  utilisateurId!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur?: UserEntity;
}
