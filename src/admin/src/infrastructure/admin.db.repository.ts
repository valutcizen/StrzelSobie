import { IDatabase } from '@strzel-sobie/common';
import { AuditLog } from '@strzel-sobie/common';
import { IAdminRepository } from '../domain/admin.repository';

export class AdminDbRepository implements IAdminRepository {
  constructor(private readonly db: IDatabase) {}

  public async logAction(log: AuditLog): Promise<void> {
    const { action_type, target_id, details } = log;
    const stmt = this.db.prepare(
      'INSERT INTO admin_audit_logs (action_type, target_id, details) VALUES (?, ?, ?)'
    );
    await stmt.bind(action_type, target_id, JSON.stringify(details)).run();
  }
}