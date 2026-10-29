import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { IdentityAuditableEntity } from '../../../../common/entities/identity-auditable.entity';
import { ParametreTableEntity } from './parametre-table.entity';

/**
 * Entité TypeORM de la table `parametres_integrite`.
 *
 * Reprise de la table `PARINT` : colonnes métier qui référencent une table
 * de paramètres, consultées avant de supprimer une clé encore utilisée.
 */
@Entity({ name: 'parametres_integrite' })
export class ParametreIntegriteEntity extends IdentityAuditableEntity {
  @Index('IDX_parametres_integrite_code_table')
  @Column({ name: 'code_table', type: 'nvarchar', length: 4 })
  codeTable!: string;

  @ManyToOne(() => ParametreTableEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'code_table', referencedColumnName: 'codeTable' })
  parametreTable?: ParametreTableEntity;

  /** Colonne métier concernée (ex. : `pointages.type_action`). */
  @Column({ name: 'rubrique_fichier', type: 'nvarchar', length: 50 })
  rubriqueFichier!: string;
}
