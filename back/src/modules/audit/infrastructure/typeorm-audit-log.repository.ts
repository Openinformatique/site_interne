import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditLogRecord,
  AuditLogRepositoryPort,
} from '../domain/audit-log-repository.port';
import { AuditLogEntity } from './entities/audit-log.entity';

/**
 * Implémentation TypeORM du repository d'audit.
 *
 * Insertion uniquement : le journal d'audit est immuable, aucune méthode
 * de mise à jour ou de suppression n'existe.
 */
@Injectable()
export class TypeOrmAuditLogRepository implements AuditLogRepositoryPort {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly repository: Repository<AuditLogEntity>,
  ) {}

  async insert(record: AuditLogRecord): Promise<void> {
    await this.repository.insert(
      this.repository.create({
        category: record.category,
        action: record.action,
        actorUserId: record.actorUserId ?? null,
        resourceType: record.resourceType ?? null,
        resourceId: record.resourceId ?? null,
        requestId: record.requestId ?? null,
        ipAddress: record.ipAddress ?? null,
        userAgent: record.userAgent ?? null,
        metadata: record.metadata ?? null,
      }),
    );
  }
}
