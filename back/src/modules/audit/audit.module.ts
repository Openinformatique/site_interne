import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditService } from './application/audit.service';
import { AUDIT_LOG_REPOSITORY } from './domain/audit-log-repository.port';
import { AuditLogEntity } from './infrastructure/entities/audit-log.entity';
import { TypeOrmAuditLogRepository } from './infrastructure/typeorm-audit-log.repository';

/**
 * Module du journal d'audit persistant.
 *
 * Distinct des logs techniques Pino : il conserve en base les événements
 * significatifs (sécurité, technique, métier). Les autres modules
 * consomment AuditService pour déclarer leurs événements explicitement.
 *
 * Aucun contrôleur : le journal est immuable et ne s'expose pas via
 * l'API dans cette version du socle.
 */
@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity])],
  providers: [
    AuditService,
    {
      provide: AUDIT_LOG_REPOSITORY,
      useClass: TypeOrmAuditLogRepository,
    },
  ],
  exports: [AuditService],
})
export class AuditModule {}
