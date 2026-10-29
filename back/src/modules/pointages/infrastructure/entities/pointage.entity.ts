import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { IdentityAuditableEntity } from '../../../../common/entities/identity-auditable.entity';
import { ClientEntity } from '../../../clients/infrastructure/entities/client.entity';
import { ContactEntity } from '../../../clients/infrastructure/entities/contact.entity';
import { CommandeEntity } from '../../../commandes/infrastructure/entities/commande.entity';
import { UserEntity } from '../../../users/infrastructure/entities/user.entity';

/**
 * Entité TypeORM de la table `pointages`.
 *
 * Reprise de la table `Pointage` : temps passé par un salarié sur un
 * créneau horaire. Client, commande et contact sont facultatifs : un
 * pointage sans client correspond à du temps interne.
 */
@Entity({ name: 'pointages' })
export class PointageEntity extends IdentityAuditableEntity {
  @Index('IDX_pointages_utilisateur_id')
  @Column({ name: 'utilisateur_id', type: 'uniqueidentifier', nullable: true })
  utilisateurId!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur?: UserEntity;

  @Column({ name: 'date_heure_debut', type: 'datetime2', nullable: true })
  dateHeureDebut!: Date | null;

  @Column({ name: 'date_heure_fin', type: 'datetime2', nullable: true })
  dateHeureFin!: Date | null;

  @Index('IDX_pointages_client_id')
  @Column({ name: 'client_id', type: 'int', nullable: true })
  clientId!: number | null;

  @ManyToOne(() => ClientEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'client_id' })
  client?: ClientEntity;

  @Index('IDX_pointages_commande_id')
  @Column({ name: 'commande_id', type: 'int', nullable: true })
  commandeId!: number | null;

  @ManyToOne(() => CommandeEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'commande_id' })
  commande?: CommandeEntity;

  @Index('IDX_pointages_contact_id')
  @Column({ name: 'contact_id', type: 'int', nullable: true })
  contactId!: number | null;

  @ManyToOne(() => ContactEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'contact_id' })
  contact?: ContactEntity;

  @Column({
    name: 'description',
    type: 'nvarchar',
    length: 'MAX',
    nullable: true,
  })
  description!: string | null;

  /** Clé de paramètre. */
  @Column({ name: 'type_action', type: 'nvarchar', length: 20, nullable: true })
  typeAction!: string | null;

  /**
   * Code de facturation repris tel quel de l'application historique :
   * 0 = non facturable, 1 = facturable ; 3 et 4 existent dans les données
   * reprises (sémantique à documenter dans le paramétrage).
   */
  @Column({ name: 'facturable', type: 'smallint', default: 0 })
  facturable!: number;

  /**
   * Temps facturable en heures (4 décimales : minutes non multiples de
   * 15, ex. 0,3167 h = 19 min). Généralement égal à la durée du créneau.
   */
  @Column({
    name: 'temps_facturable',
    type: 'decimal',
    precision: 9,
    scale: 4,
    nullable: true,
  })
  tempsFacturable!: string | null;
}
