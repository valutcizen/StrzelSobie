import { IDatabase, Result } from '@strzel-sobie/common';
import { AuditLogEntry } from '@strzel-sobie/common';
import { IAdminRepository } from '../domain/admin.repository';
import { ShootingRange } from '../domain/shooting-range.model';

export class AdminDbRepository implements IAdminRepository {
  constructor(private readonly db: IDatabase) {}

  public async findAll(): Promise<Result<ShootingRange[], Error>> {
    try {
      const stmt = this.db.prepare('SELECT id, slug, display_name as displayName FROM admin_shooting_ranges');
      const { results } = await stmt.all<ShootingRange>();
      return Result.ok(results);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  public async logAction(log: AuditLogEntry): Promise<void> {
    const { action_type, target_id, details } = log;
    const stmt = this.db.prepare(
      'INSERT INTO admin_audit_logs (action_type, target_id, details) VALUES (?, ?, ?)'
    );
    await stmt.bind(action_type, target_id, JSON.stringify(details)).run();
  }

  public async getRangeById(rangeId: number): Promise<{ id: number } | null> {
    const stmt = this.db.prepare('SELECT id FROM admin_shooting_ranges WHERE id = ?');
    const result = await stmt.bind(rangeId).first<{ id: number }>();
    return result ?? null;
  }
}