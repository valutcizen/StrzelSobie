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
        `INSERT INTO ranges_shooting_ranges (slug, display_name, total_tracks, operating_hours)
         VALUES (?, ?, ?, ?)`
      )
      .bind('krakow', 'Strzelnica Kraków', 6, '{"monday":{"open":"08:00","close":"18:00"}}')
      .run();

    const ranges = await repository.findAll();
    expect(ranges).toEqual(
      expect.arrayContaining([
        {
          id: 1,
          slug: 'dobczyce',
          displayName: 'Strzelnica Dobczyce',
          totalTracks: 10,
          operatingHours:
            '{"monday":{"open":"09:00","close":"17:00"},"tuesday":{"open":"09:00","close":"17:00"},"wednesday":{"open":"09:00","close":"17:00"},"thursday":{"open":"09:00","close":"17:00"},"friday":{"open":"09:00","close":"17:00"}}',
        },
        {
          id: 2,
          slug: 'krakow',
          displayName: 'Strzelnica Kraków',
          totalTracks: 6,
          operatingHours: '{"monday":{"open":"08:00","close":"18:00"}}',
        },
      ])
    );
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
    const range = await repository.findBySlug('dobczyce');
    expect(range).toEqual({
      id: 1,
      slug: 'dobczyce',
      displayName: 'Strzelnica Dobczyce',
      totalTracks: 10,
      operatingHours:
        '{"monday":{"open":"09:00","close":"17:00"},"tuesday":{"open":"09:00","close":"17:00"},"wednesday":{"open":"09:00","close":"17:00"},"thursday":{"open":"09:00","close":"17:00"},"friday":{"open":"09:00","close":"17:00"}}',
    });
  });

  it('findBySlug returns null when range missing', async () => {
    const range = await repository.findBySlug('missing-range');
    expect(range).toBeNull();
  });

  it('update modifies existing range values', async () => {
    await repository.update({
      id: 1,
      slug: 'dobczyce',
      displayName: 'Strzelnica Dobczyce',
      totalTracks: 12,
      operatingHours: '{"monday":{"open":"08:00","close":"16:00"}}',
    });

    const stored = await repository.findBySlug('dobczyce');
    expect(stored?.totalTracks).toBe(12);
    expect(stored?.operatingHours).toBe('{"monday":{"open":"08:00","close":"16:00"}}');
  });

  it('getRangeIdBySlug returns identifier or null', async () => {
    await dbHandle.d1
      .prepare(
        `INSERT INTO ranges_shooting_ranges (slug, display_name, total_tracks, operating_hours)
         VALUES (?, ?, ?, ?)`
      )
      .bind('zakopane', 'Strzelnica Zakopane', 4, '{"monday":{"open":"10:00","close":"17:00"}}')
      .run();

    const existing = await repository.getRangeIdBySlug('zakopane');
    const missing = await repository.getRangeIdBySlug('unknown');

    expect(existing).toBeGreaterThan(1);
    expect(missing).toBeNull();
  });
});
