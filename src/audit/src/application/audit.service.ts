import { AuditRepository } from '../domain/audit.repository';
import { AuditLogEntry } from '@strzel-sobie/common';

export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  public async logAction(log: AuditLogEntry): Promise<void> {
    return this.auditRepository.logAction(log);
  }
}
