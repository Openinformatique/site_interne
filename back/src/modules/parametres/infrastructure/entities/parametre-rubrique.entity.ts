import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { IdentityAuditableEntity } from '../../../../common/entities/identity-auditable.entity';
import { ParametreTableEntity } from './parametre-table.entity';

/**
 * Entité TypeORM de la table `parametres_rubriques`.
 *
 * Reprise de la table `PARRUB` : rubriques (colonnes) d'une table de
 * paramètres, numérotées sur 2 caractères.
 */
@Entity({ name: 'parametres_rubriques' })
@Index(
  'UQ_parametres_rubriques_code_table_num_rubrique',
  ['codeTable', 'numRubrique'],
  { unique: true },
)
export class ParametreRubriqueEntity extends IdentityAuditableEntity {
  @Index('IDX_parametres_rubriques_code_table')
  @Column({ name: 'code_table', type: 'nvarchar', length: 4 })
  codeTable!: string;

  @ManyToOne(() => ParametreTableEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'code_table', referencedColumnName: 'codeTable' })
  parametreTable?: ParametreTableEntity;

  @Column({ name: 'num_rubrique', type: 'nvarchar', length: 2 })
  numRubrique!: string;

  @Column({ name: 'nom_rubrique', type: 'nvarchar', length: 40 })
  nomRubrique!: string;

  @Column({ name: 'format_rubrique', type: 'nvarchar', length: 20 })
  formatRubrique!: string;

  @Column({ name: 'aide_rubrique', type: 'nvarchar', length: 255 })
  aideRubrique!: string;
}
