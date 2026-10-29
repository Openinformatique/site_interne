import { Column, Entity, Index } from 'typeorm';
import { IdentityAuditableEntity } from '../../../../common/entities/identity-auditable.entity';

/**
 * Entité TypeORM de la table `parametres_tables`.
 *
 * Reprise de la table `PARTAB` du paramétrage générique historique :
 * chaque ligne déclare une table de paramètres (ex. : types d'action,
 * modes de règlement), identifiée par un code sur 4 caractères.
 *
 * Structure du paramétrage :
 *   - parametres_tables    : les tables de paramètres ;
 *   - parametres_rubriques : les rubriques (colonnes) de chaque table ;
 *   - parametres           : les valeurs, une ligne par clé et rubrique ;
 *   - parametres_integrite : les colonnes métier qui utilisent la table.
 */
@Entity({ name: 'parametres_tables' })
export class ParametreTableEntity extends IdentityAuditableEntity {
  @Index('UQ_parametres_tables_code_table', { unique: true })
  @Column({ name: 'code_table', type: 'nvarchar', length: 4 })
  codeTable!: string;

  @Column({ name: 'nom_table', type: 'nvarchar', length: 40 })
  nomTable!: string;

  @Column({ name: 'nom_cle', type: 'nvarchar', length: 20 })
  nomCle!: string;

  @Column({ name: 'taille_cle', type: 'smallint' })
  tailleCle!: number;

  @Column({ name: 'aide_table', type: 'nvarchar', length: 255 })
  aideTable!: string;

  /** Repris tel quel de `Modifable_super` (sémantique à confirmer). */
  @Column({ name: 'modifiable_super', type: 'smallint' })
  modifiableSuper!: number;

  @Column({ name: 'code_dans_combo', type: 'bit' })
  codeDansCombo!: boolean;
}
