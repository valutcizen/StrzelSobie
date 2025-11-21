import { IDatabase } from '@strzel-sobie/common/models';
import { IRangesRepository } from '../domain/ranges.repository';
import { ShootingRange } from '../domain/shooting-range.model';

// Represents the structure in the ranges_shooting_ranges table
type ShootingRangeDb = {
  id: number;
  slug: string;
  type: 'club' | 'ally' | 'coming-soon';
  allows_reservations: number;
  is_deleted: number;
  public_description: string | null;
  member_description: string | null;
  latitude: number;
  longitude: number;
  display_name: string;
  total_tracks: number | null;
  operating_hours: string;
};

export class RangesDbRepository implements IRangesRepository {
  constructor(private readonly db: IDatabase) {}

  public async findAll(): Promise<ShootingRange[]> {
    const stmt = this.db.prepare(
      `SELECT id, slug, type, allows_reservations, is_deleted, public_description, member_description, latitude, longitude, display_name, total_tracks, operating_hours
       FROM ranges_shooting_ranges
       WHERE is_deleted = 0`
    );
    const { results } = await stmt.all<ShootingRangeDb>();

    const domainRanges = results.map((dbRange) => ({
      id: dbRange.id,
      slug: dbRange.slug,
      type: dbRange.type ?? 'club',
      allowsReservations: dbRange.allows_reservations === 1,
      isDeleted: dbRange.is_deleted === 1,
      publicDescription: dbRange.public_description,
      memberDescription: dbRange.member_description,
      latitude: dbRange.latitude,
      longitude: dbRange.longitude,
      displayName: dbRange.display_name,
      totalTracks: dbRange.total_tracks,
      operatingHours: dbRange.operating_hours,
    }));

    return domainRanges;
  }


  public async existsRangeById(rangeId: number): Promise<boolean> {
    const stmt = this.db.prepare('SELECT 1 FROM ranges_shooting_ranges WHERE id = ? AND is_deleted = 0');
    const result = await stmt.bind(rangeId).first<number>();
    return result ? true : false;
  }

  public async findBySlug(slug: string): Promise<ShootingRange | null> {
    const stmt = this.db.prepare(
      `SELECT id, slug, type, allows_reservations, is_deleted, public_description, member_description, latitude, longitude, display_name, total_tracks, operating_hours
       FROM ranges_shooting_ranges WHERE slug = ? AND is_deleted = 0`
    );
    const result = await stmt.bind(slug).first<ShootingRangeDb>();

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      slug: result.slug,
      type: result.type ?? 'club',
      allowsReservations: result.allows_reservations === 1,
      isDeleted: result.is_deleted === 1,
      publicDescription: result.public_description,
      memberDescription: result.member_description,
      latitude: result.latitude,
      longitude: result.longitude,
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
      'SELECT id FROM ranges_shooting_ranges WHERE slug = ? AND is_deleted = 0'
    );
    const result = await stmt.bind(slug).first<{ id : number }>();

    if (!result) {
      return null;
    }

    return result.id;
  }

  public async softDeleteById(id: number, deletedSlug: string): Promise<void> {
    const stmt = this.db.prepare('UPDATE ranges_shooting_ranges SET is_deleted = 1, slug = ? WHERE id = ?');
    await stmt.bind(deletedSlug, id).run();
  }
}
