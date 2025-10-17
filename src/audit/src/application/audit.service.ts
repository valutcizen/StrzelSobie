import { AuditRepository } from '../domain/audit.repository';
import { AuditLogEntry, IAuditService, Result } from '@strzel-sobie/common';

export class AuditService implements IAuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  public async logAction(log: AuditLogEntry): Promise<Result<void, Error>> {
    try {
      await this.auditRepository.logAction(log);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }
}
