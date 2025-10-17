import { IDatabase, Result, AuditLogEntry } from '@strzel-sobie/common';
import { IRangesRepository } from '../domain/ranges.repository';
import { ShootingRange } from '../domain/shooting-range.model';

// Represents the structure in the ranges_shooting_ranges table
type ShootingRangeDb = {
  id: number;
  slug: string;
  display_name: string;
  total_tracks: number;
  operating_hours: string;
};

export class RangesDbRepository implements IRangesRepository {
  constructor(private readonly db: IDatabase) {}

  public async findAll(): Promise<ShootingRange[]> {
    const stmt = this.db.prepare('SELECT id, slug, display_name, total_tracks, operating_hours FROM ranges_shooting_ranges');
    const { results } = await stmt.all<ShootingRangeDb>();

    const domainRanges = results.map((dbRange) => ({
      id: dbRange.id,
      slug: dbRange.slug,
      displayName: dbRange.display_name,
      totalTracks: dbRange.total_tracks,
      operatingHours: dbRange.operating_hours,
    }));

    return domainRanges;
  }


  public async existsRangeById(rangeId: number): Promise<boolean> {
    const stmt = this.db.prepare('SELECT 1 FROM ranges_shooting_ranges WHERE id = ?');
    const result = await stmt.bind(rangeId).first<number>();
    return result ? true : false;
  }

  public async findBySlug(slug: string): Promise<ShootingRange | null> {
    const stmt = this.db.prepare(
      'SELECT id, slug, display_name, total_tracks, operating_hours FROM ranges_shooting_ranges WHERE slug = ?'
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

  public async update(range: ShootingRange): Promise<void> {
    const stmt = this.db.prepare(
      'UPDATE ranges_shooting_ranges SET total_tracks = ?, operating_hours = ? WHERE id = ?'
    );
    await stmt.bind(range.totalTracks, range.operatingHours, range.id).run();
  }
  
  public async getRangeIdBySlug(slug: string): Promise<number | null> {
    const stmt = this.db.prepare(
      'SELECT id FROM ranges_shooting_ranges WHERE slug = ?'
    );
    const result = await stmt.bind(slug).first<{ id : number }>();

    if (!result) {
      return null;
    }

    return result.id;
  }
}