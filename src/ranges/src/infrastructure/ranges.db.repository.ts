import { IDatabase } from '@strzel-sobie/common/models';
import { IRangesRepository } from '../domain/ranges.repository';
import { ShootingRange, ShootingRangeSummary } from '../domain/shooting-range.model';

// Represents the structure in the ranges_shooting_ranges table
type ShootingRangeDb = {
  id: number;
  slug: string;
  type: 'club' | 'ally' | 'coming-soon' | 'meetup';
  allows_reservations: number;
  is_deleted: number;
  public_description: string | null;
  member_description: string | null;
  latitude: number | null;
  longitude: number | null;
  display_name: string;
  total_tracks: number | null;
  operating_hours: string;
  extras: string | null;
};

type ShootingRangeSummaryDb = Pick<
  ShootingRangeDb,
  'id' | 'slug' | 'type' | 'allows_reservations' | 'latitude' | 'longitude' | 'display_name' | 'extras'
>;

export class RangesDbRepository implements IRangesRepository {
  constructor(private readonly db: IDatabase) {}

  private mapDbRange(dbRange: ShootingRangeDb): ShootingRange {
    return {
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
      extras: dbRange.extras ?? '{}',
    };
  }

  private mapDbRangeSummary(dbRange: ShootingRangeSummaryDb): ShootingRangeSummary {
    return {
      id: dbRange.id,
      slug: dbRange.slug,
      type: dbRange.type ?? 'club',
      allowsReservations: dbRange.allows_reservations === 1,
      latitude: dbRange.latitude,
      longitude: dbRange.longitude,
      displayName: dbRange.display_name,
      extras: dbRange.extras,
    };
  }

  public async findAll(): Promise<ShootingRangeSummary[]> {
    const stmt = this.db.prepare(
      `SELECT id, slug, type, allows_reservations, latitude, longitude, display_name, extras
       FROM ranges_shooting_ranges
       WHERE is_deleted = 0`
    );
    const { results } = await stmt.all<ShootingRangeSummaryDb>();

    return results.map((dbRange) => this.mapDbRangeSummary(dbRange));
  }


  public async existsRangeById(rangeId: number): Promise<boolean> {
    const stmt = this.db.prepare('SELECT 1 FROM ranges_shooting_ranges WHERE id = ? AND is_deleted = 0');
    const result = await stmt.bind(rangeId).first<number>();
    return result ? true : false;
  }

  public async findBySlug(slug: string): Promise<ShootingRange | null> {
    const stmt = this.db.prepare(
      `SELECT id, slug, type, allows_reservations, is_deleted, public_description, member_description, latitude, longitude, display_name, total_tracks, operating_hours, extras
       FROM ranges_shooting_ranges WHERE slug = ? AND is_deleted = 0`
    );
    const result = await stmt.bind(slug).first<ShootingRangeDb>();

    if (!result) {
      return null;
    }

    return this.mapDbRange(result);
  }

  public async create(range: Omit<ShootingRange, 'id'>): Promise<ShootingRange> {
    const stmt = this.db.prepare(
      `INSERT INTO ranges_shooting_ranges (slug, display_name, type, allows_reservations, is_deleted, public_description, member_description, latitude, longitude, operating_hours, total_tracks, extras)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`
    );

    await stmt
      .bind(
        range.slug,
        range.displayName,
        range.type,
        range.allowsReservations ? 1 : 0,
        range.publicDescription ?? null,
        range.memberDescription ?? null,
        range.latitude ?? 0,
        range.longitude ?? 0,
        range.operatingHours ?? '{}',
        range.totalTracks ?? null,
        range.extras ?? '{}'
      )
      .run();

    const created = await this.findBySlug(range.slug);
    if (!created) {
      throw new Error('Failed to create range');
    }

    return created;
  }

  public async update(range: ShootingRange): Promise<void> {
    const existingStmt = this.db.prepare(
      `SELECT id, slug, type, allows_reservations, is_deleted, public_description, member_description, latitude, longitude, display_name, total_tracks, operating_hours, extras
       FROM ranges_shooting_ranges WHERE id = ?`
    );
    const existing = await existingStmt.bind(range.id).first<ShootingRangeDb>();

    if (!existing) {
      throw new Error('Range not found');
    }

    const merged = {
      display_name: range.displayName ?? existing.display_name,
      type: range.type ?? existing.type ?? 'club',
      allows_reservations: range.allowsReservations ?? (existing.allows_reservations === 1),
      public_description:
        range.publicDescription !== undefined ? range.publicDescription : existing.public_description,
      member_description:
        range.memberDescription !== undefined ? range.memberDescription : existing.member_description,
      latitude: range.latitude !== undefined ? range.latitude : existing.latitude,
      longitude: range.longitude !== undefined ? range.longitude : existing.longitude,
      total_tracks: range.totalTracks ?? existing.total_tracks,
      operating_hours: range.operatingHours ?? existing.operating_hours,
      extras: range.extras ?? existing.extras,
    };

    const stmt = this.db.prepare(
      `UPDATE ranges_shooting_ranges
       SET display_name = ?, type = ?, allows_reservations = ?, public_description = ?, member_description = ?, latitude = ?, longitude = ?, total_tracks = ?, operating_hours = ?, extras = ?
       WHERE id = ?`
    );
    await stmt
      .bind(
        merged.display_name,
        merged.type,
        merged.allows_reservations ? 1 : 0,
        merged.public_description ?? null,
        merged.member_description ?? null,
        merged.latitude ?? null,
        merged.longitude ?? null,
        merged.total_tracks,
        merged.operating_hours,
        merged.extras ?? '{}',
        range.id
      )
      .run();
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
