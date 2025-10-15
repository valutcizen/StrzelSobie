import { IDatabase, Result, AuditLogEntry } from '@strzel-sobie/common';
import { IAdminRepository } from '../domain/admin.repository';
import { ShootingRange } from '../domain/shooting-range.model';

// Represents the structure in the admin_shooting_ranges table
type ShootingRangeDb = {
  id: number;
  slug: string;
  display_name: string;
  total_tracks: number;
  operating_hours: string;
};

export class AdminDbRepository implements IAdminRepository {
  constructor(private readonly db: IDatabase) {}

  public async findAll(): Promise<Result<ShootingRange[], Error>> {
    try {
      const stmt = this.db.prepare('SELECT id, slug, display_name, total_tracks, operating_hours FROM admin_shooting_ranges');
      const { results } = await stmt.all<ShootingRangeDb>();

      const domainRanges = results.map((dbRange) => ({
        id: dbRange.id,
        slug: dbRange.slug,
        displayName: dbRange.display_name,
        totalTracks: dbRange.total_tracks,
        operatingHours: dbRange.operating_hours,
      }));

      return Result.ok(domainRanges);
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

  public async findBySlug(slug: string): Promise<ShootingRange | null> {
    const stmt = this.db.prepare(
      'SELECT id, slug, display_name, total_tracks, operating_hours FROM admin_shooting_ranges WHERE slug = ?'
    );
    const result = await stmt.bind(slug).first<ShootingRangeDb>();

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      slug: result.slug,
      displayName: result.display_name,
      totalTracks: result.total_tracks,
      operatingHours: result.operating_hours,
    };
  }

  public async update(range: ShootingRange): Promise<Result<void, Error>> {
    try {
      const stmt = this.db.prepare(
        'UPDATE admin_shooting_ranges SET total_tracks = ?, operating_hours = ? WHERE id = ?'
      );
      await stmt.bind(range.totalTracks, range.operatingHours, range.id).run();
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }
}