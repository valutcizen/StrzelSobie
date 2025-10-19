import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { ReservationsDbRepository } from '../../src/reservations/src/infrastructure/reservations.db.repository';
import { createTestDatabase, type TestDatabase } from '../utils/database';

type PropositionRow = {
  id: number;
  user_id: number;
  range_id: number;
  status: 'open' | 'converted' | 'cancelled';
  event_date: string;
  start_time: string;
  end_time: string;
  num_participants: number;
  tracks_requested: number;
};

type ReservationRow = {
  id: number;
  proposition_id: number | null;
  range_id: number;
  coordinator_id: number;
  event_date: string;
  start_time: string;
  end_time: string;
  num_participants: number;
  tracks_requested: number;
  is_public: number;
  is_joinable: number;
};

describe('ReservationsDbRepository integration', () => {
  let dbHandle: TestDatabase;
  let repository: ReservationsDbRepository;

  const defaultProposition = {
    user_id: 2,
    range_id: 1,
    status: 'open' as const,
    event_date: '2024-01-01',
    start_time: '09:00',
    end_time: '10:00',
    num_participants: 3,
    tracks_requested: 2,
  };

  const defaultReservation = {
    proposition_id: null as number | null,
    range_id: 1,
    coordinator_id: 2,
    event_date: '2024-01-02',
    start_time: '11:00',
    end_time: '13:00',
    num_participants: 4,
    tracks_requested: 3,
    is_public: 1,
    is_joinable: 0,
  };

  const insertRange = async (
    slug: string,
    displayName: string,
    totalTracks: number,
    operatingHours = '{"monday":{"open":"09:00","close":"17:00"}}'
  ): Promise<number> => {
    const statement = dbHandle.d1.prepare(
      `INSERT INTO ranges_shooting_ranges (slug, display_name, total_tracks, operating_hours)
       VALUES (?, ?, ?, ?)
       RETURNING id`
    );
    const record = await statement.bind(slug, displayName, totalTracks, operatingHours).first<{ id: number }>();
    if (!record) {
      throw new Error('Failed to insert range fixture');
    }
    return record.id;
  };

  const insertProposition = async (overrides: Partial<typeof defaultProposition> = {}): Promise<PropositionRow> => {
    const data = { ...defaultProposition, ...overrides };
    const statement = dbHandle.d1.prepare(
      `INSERT INTO reservations_propositions
        (user_id, range_id, status, event_date, start_time, end_time, num_participants, tracks_requested)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id, user_id, range_id, status, event_date, start_time, end_time, num_participants, tracks_requested`
    );
    const record = await statement
      .bind(
        data.user_id,
        data.range_id,
        data.status,
        data.event_date,
        data.start_time,
        data.end_time,
        data.num_participants,
        data.tracks_requested
      )
      .first<PropositionRow>();
    if (!record) {
      throw new Error('Failed to insert proposition fixture');
    }
    return record;
  };

  const insertReservation = async (overrides: Partial<typeof defaultReservation> = {}): Promise<ReservationRow> => {
    const data = { ...defaultReservation, ...overrides };
    const statement = dbHandle.d1.prepare(
      `INSERT INTO reservations_reservations
        (proposition_id, range_id, coordinator_id, event_date, start_time, end_time, num_participants, tracks_requested, is_public, is_joinable)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id, proposition_id, range_id, coordinator_id, event_date, start_time, end_time, num_participants, tracks_requested, is_public, is_joinable`
    );
    const record = await statement
      .bind(
        data.proposition_id,
        data.range_id,
        data.coordinator_id,
        data.event_date,
        data.start_time,
        data.end_time,
        data.num_participants,
        data.tracks_requested,
        data.is_public,
        data.is_joinable
      )
      .first<ReservationRow>();
    if (!record) {
      throw new Error('Failed to insert reservation fixture');
    }
    return record;
  };

  beforeEach(async () => {
    dbHandle = await createTestDatabase();
    repository = new ReservationsDbRepository(dbHandle.db);
  });

  afterEach(() => {
    dbHandle.cleanup();
  });

  it('getPropositions filters by range and date window', async () => {
    const matching = await insertProposition({ event_date: '2024-03-10' });
    await insertProposition({ event_date: '2024-04-01' });

    const otherRangeId = await insertRange('krakow', 'Strzelnica Kraków', 6);
    await dbHandle.d1
      .prepare(
        `INSERT INTO reservations_propositions
          (user_id, range_id, status, event_date, start_time, end_time, num_participants, tracks_requested)
         VALUES (2, ?, 'open', '2024-03-15', '10:00', '11:00', 4, 2)`
      )
      .bind(otherRangeId)
      .run();

    const result = await repository.getPropositions(1, '2024-03-01', '2024-03-31');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: matching.id,
      range_id: 1,
      status: 'open',
      event_date: '2024-03-10',
    });
  });

  it('getReservations returns reservations for range and window', async () => {
    const expected = await insertReservation({ event_date: '2024-05-10', is_public: 1, is_joinable: 1 });
    await insertReservation({ event_date: '2024-06-01' });
    const otherRangeId = await insertRange('poznan', 'Strzelnica Poznań', 5);
    await insertReservation({ range_id: otherRangeId, event_date: '2024-05-15' });

    const reservations = await repository.getReservations(1, '2024-05-01', '2024-05-31');

    expect(reservations).toHaveLength(1);
    expect(reservations[0]).toMatchObject({
      id: expected.id,
      range_id: 1,
      is_public: true,
      is_joinable: true,
    });
  });

  it('getOverlappingUsage sums tracks for overlapping entries', async () => {
    await insertProposition({
      event_date: '2024-04-10',
      start_time: '08:00',
      end_time: '10:30',
      tracks_requested: 2,
    });
    await insertReservation({
      event_date: '2024-04-10',
      start_time: '09:00',
      end_time: '11:00',
      tracks_requested: 3,
    });

    const usage = await repository.getOverlappingUsage(1, '2024-04-10', '09:00', '10:00');
    expect(usage).toEqual({ propositions_tracks: 2, reservations_tracks: 3 });
  });

  it('getOverlappingUsage returns zeros when nothing overlaps', async () => {
    const usage = await repository.getOverlappingUsage(1, '2024-07-01', '10:00', '11:00');
    expect(usage).toEqual({ propositions_tracks: 0, reservations_tracks: 0 });
  });

  it('getOverlappingReservationsDetails returns conflicts with types', async () => {
    const proposition = await insertProposition({
      event_date: '2024-08-01',
      start_time: '10:00',
      end_time: '12:00',
      tracks_requested: 2,
    });
    const reservation = await insertReservation({
      event_date: '2024-08-01',
      start_time: '11:00',
      end_time: '13:00',
      tracks_requested: 4,
    });

    const conflicts = await repository.getOverlappingReservationsDetails(1, '2024-08-01', '10:30', '11:30');

    expect(conflicts).toEqual(
      expect.arrayContaining([
        {
          id: reservation.id,
          type: 'reservation',
          event_date: reservation.event_date,
          start_time: reservation.start_time,
          end_time: reservation.end_time,
          tracks_requested: reservation.tracks_requested,
        },
        {
          id: proposition.id,
          type: 'proposition',
          event_date: proposition.event_date,
          start_time: proposition.start_time,
          end_time: proposition.end_time,
          tracks_requested: proposition.tracks_requested,
        },
      ])
    );
  });

  it('getOverlappingReservationsDetails respects exclusion options', async () => {
    const proposition = await insertProposition({ event_date: '2024-09-01', start_time: '09:00', end_time: '10:00' });
    const reservation = await insertReservation({
      event_date: '2024-09-01',
      start_time: '09:30',
      end_time: '10:30',
      tracks_requested: 3,
    });

    const withoutReservation = await repository.getOverlappingReservationsDetails(
      1,
      '2024-09-01',
      '09:00',
      '10:30',
      { excludeReservationId: reservation.id }
    );
    expect(withoutReservation).toHaveLength(1);
    expect(withoutReservation[0].type).toBe('proposition');

    const withoutProposition = await repository.getOverlappingReservationsDetails(
      1,
      '2024-09-01',
      '09:00',
      '10:30',
      { excludePropositionId: proposition.id }
    );
    expect(withoutProposition).toHaveLength(1);
    expect(withoutProposition[0].type).toBe('reservation');
  });

  it('createProposition inserts and returns new entity', async () => {
    const proposition = await repository.createProposition({
      user_id: 3,
      range_id: 1,
      event_date: '2024-10-01',
      start_time: '10:00',
      end_time: '11:00',
      num_participants: 2,
      tracks_requested: 1,
    });

    expect(proposition).toMatchObject({
      id: expect.any(Number),
      status: 'open',
      user_id: 3,
      range_id: 1,
    });

    const stored = await repository.getPropositionById(proposition.id);
    expect(stored?.status).toBe('open');
  });

  it('getPropositionById returns proposition or null', async () => {
    const proposition = await insertProposition({ event_date: '2024-11-01' });
    const stored = await repository.getPropositionById(proposition.id);
    expect(stored?.id).toBe(proposition.id);

    const missing = await repository.getPropositionById(999);
    expect(missing).toBeNull();
  });

  it('cancelProposition sets status to cancelled only once', async () => {
    const proposition = await insertProposition({ event_date: '2024-12-01' });
    const cancelled = await repository.cancelProposition(proposition.id);
    expect(cancelled?.status).toBe('cancelled');

    const secondAttempt = await repository.cancelProposition(proposition.id);
    expect(secondAttempt).toBeNull();
  });

  it('markPropositionConverted updates proposition status', async () => {
    const proposition = await insertProposition();
    await repository.markPropositionConverted(proposition.id);

    const stored = await repository.getPropositionById(proposition.id);
    expect(stored?.status).toBe('converted');
  });

  it('createReservation returns newly stored reservation', async () => {
    const reservation = await repository.createReservation({
      proposition_id: null,
      range_id: 1,
      coordinator_id: 2,
      event_date: '2025-01-05',
      start_time: '12:00',
      end_time: '13:00',
      num_participants: 5,
      tracks_requested: 3,
      is_public: true,
      is_joinable: false,
    });

    expect(reservation).toMatchObject({
      id: expect.any(Number),
      proposition_id: null,
      is_public: true,
      is_joinable: false,
    });
  });

  it('createReservationFromProposition converts proposition and returns reservation', async () => {
    const proposition = await insertProposition();
    const reservation = await repository.createReservationFromProposition(
      {
        proposition_id: proposition.id,
        range_id: 1,
        coordinator_id: 2,
        event_date: proposition.event_date,
        start_time: proposition.start_time,
        end_time: proposition.end_time,
        num_participants: proposition.num_participants,
        tracks_requested: proposition.tracks_requested,
        is_public: false,
        is_joinable: true,
      },
      proposition.id
    );

    expect(reservation.proposition_id).toBe(proposition.id);
    expect(reservation.is_public).toBe(false);
    expect(reservation.is_joinable).toBe(true);

    const storedProposition = await repository.getPropositionById(proposition.id);
    expect(storedProposition?.status).toBe('converted');
  });

  it('getReservationById returns reservation or null', async () => {
    const reservation = await insertReservation();
    const stored = await repository.getReservationById(reservation.id);
    expect(stored?.id).toBe(reservation.id);
    expect(stored?.is_public).toBe(Boolean(reservation.is_public));

    const missing = await repository.getReservationById(999);
    expect(missing).toBeNull();
  });

  it('deleteReservation removes reservation and returns deleted entity', async () => {
    const reservation = await insertReservation();
    const deleted = await repository.deleteReservation(reservation.id);

    expect(deleted?.id).toBe(reservation.id);

    const exists = await dbHandle.d1
      .prepare('SELECT 1 FROM reservations_reservations WHERE id = ?')
      .bind(reservation.id)
      .first<number>();
    expect(exists).toBeNull();
  });

  it('createRecord inserts manual record entry', async () => {
    const record = await repository.createRecord({
      range_id: 1,
      admin_id: 1,
      event_date: '2025-02-10',
      start_time: '08:00',
      end_time: '09:00',
      num_participants: 6,
    });

    expect(record).toMatchObject({
      id: expect.any(Number),
      admin_id: 1,
      range_id: 1,
      num_participants: 6,
    });
    expect(record.created_at).toBeDefined();
  });

});
