import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { RangesDbRepository } from '../../src/ranges/src/infrastructure/ranges.db.repository';
import { createTestDatabase, type TestDatabase } from '../utils/database';

describe('RangesDbRepository integration', () => {
  let dbHandle: TestDatabase;
  let repository: RangesDbRepository;

  beforeEach(async () => {
    dbHandle = await createTestDatabase();
    repository = new RangesDbRepository(dbHandle.db);
  });

  afterEach(() => {
    dbHandle.cleanup();
  });

  it('findAll maps database rows to domain objects', async () => {
    await dbHandle.d1
      .prepare(
        `INSERT INTO ranges_shooting_ranges (slug, display_name, type, allows_reservations, total_tracks, operating_hours)
         VALUES (?, ?, 'club', 1, ?, ?)`
      )
      .bind('krakow', 'Strzelnica Kraków', 6, '{"monday":{"open":"08:00","close":"18:00"}}')
      .run();

    const ranges = await repository.findAll();
    const slugs = ranges.map((range) => range.slug).sort();
    expect(slugs).toEqual(['ally-krakow', 'coming-soon-podhale', 'krakow', 'strzel-sobie-krakow']);

    const strzelSobieKrakow = ranges.find((range) => range.slug === 'strzel-sobie-krakow');
    expect(strzelSobieKrakow).toMatchObject({
      displayName: 'Strzel Sobie Kraków',
      allowsReservations: true,
    });
  });

  it('existsRangeById returns true for existing range', async () => {
    const exists = await repository.existsRangeById(1);
    expect(exists).toBe(true);
  });

  it('existsRangeById returns false for missing range', async () => {
    const exists = await repository.existsRangeById(999);
    expect(exists).toBe(false);
  });

  it('findBySlug returns range when present', async () => {
    const range = await repository.findBySlug('strzel-sobie-krakow');
    expect(range).toMatchObject({
      id: 1,
      slug: 'strzel-sobie-krakow',
      displayName: 'Strzel Sobie Kraków',
      totalTracks: 10,
    });
    expect(range?.operatingHours).toContain('"monday"');
  });

  it('findBySlug returns null when range missing', async () => {
    const range = await repository.findBySlug('missing-range');
    expect(range).toBeNull();
  });

  it('update modifies existing range values', async () => {
    await repository.update({
      id: 1,
      slug: 'strzel-sobie-krakow',
      displayName: 'Strzel Sobie Kraków',
      totalTracks: 12,
      operatingHours: '{"monday":{"open":"08:00","close":"16:00"}}',
      type: 'club',
      allowsReservations: true,
      isDeleted: false,
    });

    const stored = await repository.findBySlug('strzel-sobie-krakow');
    expect(stored?.totalTracks).toBe(12);
    expect(stored?.operatingHours).toBe('{"monday":{"open":"08:00","close":"16:00"}}');
  });

  it('getRangeIdBySlug returns identifier or null', async () => {
    await dbHandle.d1
      .prepare(
        `INSERT INTO ranges_shooting_ranges (slug, display_name, type, allows_reservations, total_tracks, operating_hours)
         VALUES (?, ?, 'club', 1, ?, ?)`
      )
      .bind('zakopane', 'Strzelnica Zakopane', 4, '{"monday":{"open":"10:00","close":"17:00"}}')
      .run();

    const existing = await repository.getRangeIdBySlug('zakopane');
    const missing = await repository.getRangeIdBySlug('unknown');

    expect(existing).toBeGreaterThan(1);
    expect(missing).toBeNull();
  });
});
