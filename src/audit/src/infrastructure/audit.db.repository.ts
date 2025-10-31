import { AuditLogEntry, IDatabase } from '@strzel-sobie/common/models';
import { AuditRepository } from '../domain/audit.repository';

export class AuditDbRepository implements AuditRepository {
  constructor(private readonly db: IDatabase) {}

  public async logAction(log: AuditLogEntry): Promise<void> {
    const { action_type, target_id, details } = log;
    const stmt = this.db.prepare(
      'INSERT INTO audit_logs (action_type, target_id, details) VALUES (?, ?, ?)'
    );
    await stmt.bind(action_type, target_id, JSON.stringify(details)).run();
  }
}
