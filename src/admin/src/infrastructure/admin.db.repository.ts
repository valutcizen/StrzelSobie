import { IAdminRepository } from '../domain/admin.repository';
import { AdminLog, IDatabase } from '@strzel-sobie/common';     

export class AdminDbRepository implements IAdminRepository {
  constructor(private readonly db: IDatabase) {}

  async logAction(log: AdminLog): Promise<void> {
    const { action_type, target_id, details } = log;
    const stmt = this.db.prepare(
      'INSERT INTO admin_audit_logs (action_type, target_id, details) VALUES (?, ?, ?)'
    );
    await stmt.bind(action_type, target_id, JSON.stringify(details)).run();
  }
}
