import { PrimaryGeneratedColumn } from 'typeorm';
import { AuditColumnsEntity } from './audit-columns.entity';

/**
 * Classe de base des entités TypeORM modifiables à identifiant entier.
 *
 * Réservée aux entités métier reprises de l'application historique
 * (WebDev / HFSQL) : l'identifiant IDENTITY permet de conserver les
 * identifiants d'origine lors de la future reprise de données
 * (SET IDENTITY_INSERT). Les dates techniques et la traçabilité
 * proviennent d'AuditColumnsEntity.
 */
export abstract class IdentityAuditableEntity extends AuditColumnsEntity {
  /** Entier auto-incrémenté (IDENTITY) généré par la base. */
  @PrimaryGeneratedColumn('increment', { name: 'id', type: 'int' })
  id!: number;
}
