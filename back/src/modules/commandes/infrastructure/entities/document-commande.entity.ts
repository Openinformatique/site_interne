import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { IdentityAuditableEntity } from '../../../../common/entities/identity-auditable.entity';
import { CommandeEntity } from './commande.entity';

/**
 * Entité TypeORM de la table `documents_commande`.
 *
 * Reprise de la table `Document_Commande`. Le contenu binaire
 * (ex-`Doc_Bin`) n'est PAS stocké en base : il est confié au module
 * storage (FileStoragePort) ; seules la référence au fichier stocké et ses
 * métadonnées sont conservées ici.
 */
@Entity({ name: 'documents_commande' })
export class DocumentCommandeEntity extends IdentityAuditableEntity {
  /** Clé de paramètre. */
  @Column({
    name: 'type_document',
    type: 'nvarchar',
    length: 20,
    nullable: true,
  })
  typeDocument!: string | null;

  /** Nom d'origine du fichier, à titre informatif. */
  @Column({
    name: 'nom_fichier',
    type: 'nvarchar',
    length: 250,
    nullable: true,
  })
  nomFichier!: string | null;

  @Column({
    name: 'commentaire',
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  commentaire!: string | null;

  /** Identifiant opaque du fichier dans le stockage (StoredFile.identifier). */
  @Column({ name: 'fichier_identifiant', type: 'nvarchar', length: 100 })
  fichierIdentifiant!: string;

  @Column({ name: 'type_mime', type: 'nvarchar', length: 255 })
  typeMime!: string;

  /** Taille en octets (bigint renvoyé en chaîne par le driver mssql). */
  @Column({ name: 'taille_octets', type: 'bigint' })
  tailleOctets!: string;

  @Index('IDX_documents_commande_commande_id')
  @Column({ name: 'commande_id', type: 'int' })
  commandeId!: number;

  @ManyToOne(() => CommandeEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'commande_id' })
  commande?: CommandeEntity;
}
