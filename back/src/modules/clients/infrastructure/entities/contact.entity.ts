import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { IdentityAuditableEntity } from '../../../../common/entities/identity-auditable.entity';
import { ClientEntity } from './client.entity';

/**
 * Entité TypeORM de la table `contacts`.
 *
 * Reprise de la table `Contact` de l'application historique : un contact
 * appartient toujours à un client.
 */
@Entity({ name: 'contacts' })
export class ContactEntity extends IdentityAuditableEntity {
  @Column({
    name: 'nom_contact',
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  nomContact!: string | null;

  /** 1 = M., 2 = Mme. */
  @Column({ name: 'civilite', type: 'int', nullable: true })
  civilite!: number | null;

  @Column({
    name: 'adresse_email',
    type: 'nvarchar',
    length: 255,
    nullable: true,
  })
  adresseEmail!: string | null;

  @Column({
    name: 'numero_telephone',
    type: 'nvarchar',
    length: 50,
    nullable: true,
  })
  numeroTelephone!: string | null;

  @Index('IDX_contacts_client_id')
  @Column({ name: 'client_id', type: 'int' })
  clientId!: number;

  @ManyToOne(() => ClientEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'client_id' })
  client?: ClientEntity;

  @Column({ name: 'actif', type: 'bit', default: true })
  actif!: boolean;

  /**
   * Libellé du poste en clair (pas une clé de paramètre). Élargi à 50
   * caractères : l'ancien champ (20) tronquait certains libellés.
   */
  @Column({ name: 'poste', type: 'nvarchar', length: 50, nullable: true })
  poste!: string | null;
}
