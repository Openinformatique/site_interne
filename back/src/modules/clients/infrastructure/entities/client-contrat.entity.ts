import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { IdentityAuditableEntity } from '../../../../common/entities/identity-auditable.entity';
import { ClientEntity } from './client.entity';

/**
 * Entité TypeORM de la table `client_contrats`.
 *
 * Reprise de la table `Client_contrat` de l'application historique.
 *
 * La contrainte unique (id, client_id) sert de cible à la clé étrangère
 * composite de `commandes` : elle garantit qu'une commande ne peut être
 * rattachée qu'à un contrat de son propre client.
 */
@Entity({ name: 'client_contrats' })
@Unique('UQ_client_contrats_id_client_id', ['id', 'clientId'])
export class ClientContratEntity extends IdentityAuditableEntity {
  @Column({
    name: 'libelle_contrat',
    type: 'nvarchar',
    length: 250,
    nullable: true,
  })
  libelleContrat!: string | null;

  @Column({ name: 'date_mise_en_place', type: 'date', nullable: true })
  dateMiseEnPlace!: string | null;

  @Column({ name: 'date_echeance', type: 'date', nullable: true })
  dateEcheance!: string | null;

  @Index('IDX_client_contrats_client_id')
  @Column({ name: 'client_id', type: 'int' })
  clientId!: number;

  @ManyToOne(() => ClientEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'client_id' })
  client?: ClientEntity;
}
