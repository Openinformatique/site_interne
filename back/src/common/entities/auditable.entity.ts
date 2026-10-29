import { PrimaryGeneratedColumn } from 'typeorm';
import { AuditColumnsEntity } from './audit-columns.entity';

/**
 * Classe de base des entités TypeORM modifiables à identifiant UUID.
 *
 * Fournit l'identifiant UUID ; les dates techniques et la traçabilité
 * créateur/modificateur proviennent d'AuditColumnsEntity.
 *
 * Les entités métier reprises de l'application historique utilisent
 * IdentityAuditableEntity (identifiant entier). Les entités immuables
 * (ex. : audit logs) n'étendent PAS cette classe : elles utilisent une
 * base plus légère (voir ImmutableEntity).
 */
export abstract class AuditableEntity extends AuditColumnsEntity {
  /** UUID SQL Server (uniqueidentifier) généré par la base. */
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;
}
