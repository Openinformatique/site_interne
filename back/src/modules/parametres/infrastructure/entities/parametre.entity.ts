import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { IdentityAuditableEntity } from '../../../../common/entities/identity-auditable.entity';
import { ParametreTableEntity } from './parametre-table.entity';

/**
 * Entité TypeORM de la table `parametres`.
 *
 * Reprise de la table `PARFIC` : valeur d'une rubrique pour une clé de
 * paramètre. Une clé (ex. : un type d'action) occupe donc une ligne par
 * rubrique de sa table. Les colonnes métier (`type_action`,
 * `mode_reglement`…) stockent `cle_parametre`.
 */
@Entity({ name: 'parametres' })
@Index(
  'UQ_parametres_code_table_cle_parametre_num_rubrique',
  ['codeTable', 'cleParametre', 'numRubrique'],
  { unique: true },
)
@Index('IDX_parametres_code_table_num_rubrique', ['codeTable', 'numRubrique'])
export class ParametreEntity extends IdentityAuditableEntity {
  @Column({ name: 'code_table', type: 'nvarchar', length: 4 })
  codeTable!: string;

  @ManyToOne(() => ParametreTableEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'code_table', referencedColumnName: 'codeTable' })
  parametreTable?: ParametreTableEntity;

  @Column({ name: 'cle_parametre', type: 'nvarchar', length: 8 })
  cleParametre!: string;

  @Column({ name: 'num_rubrique', type: 'nvarchar', length: 2 })
  numRubrique!: string;

  @Column({ name: 'zone_parametre', type: 'nvarchar', length: 80 })
  zoneParametre!: string;

  @Column({ name: 'actif', type: 'bit', default: true })
  actif!: boolean;
}
