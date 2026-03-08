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
  firing_line_id: number;
  metadata_json: string;
  is_member: number;
};

type ReservationRow = {
  id: number;
  proposition_id: number | null;
  range_id: number;
  approved_by_admin_id: number;
  event_date: string;
  start_time: string;
  end_time: string;
  firing_line_id: number;
  metadata_json: string;
};

describe('ReservationsDbRepository integration', () => {
  let dbHandle: TestDatabase;
  let repository: ReservationsDbRepository;
  let defaultFiringLineId: number;

  const defaultProposition = {
    user_id: 2,
    range_id: 1,
    status: 'open' as const,
    event_date: '2024-01-01',
    start_time: '09:00',
    end_time: '10:00',
    firing_line_id: 0,
    metadata_json: JSON.stringify({ trackNos: [1, 2], hasCoordinatorLicenseInGroup: true }),
  };

  const defaultReservation = {
    proposition_id: null as number | null,
    range_id: 1,
    approved_by_admin_id: 2,
    event_date: '2024-01-02',
    start_time: '11:00',
    end_time: '13:00',
    firing_line_id: 0,
    metadata_json: JSON.stringify({ trackNos: [3, 4] }),
  };

  const insertRange = async (
    slug: string,
    displayName: string,
    totalTracks: number,
    operatingHours = '{"monday":{"open":"09:00","close":"17:00"}}'
  ): Promise<number> => {
    const statement = dbHandle.d1.prepare(
      `INSERT INTO ranges_shooting_ranges (slug, display_name, type, allows_reservations, total_tracks, operating_hours)
       VALUES (?, ?, 'club', 1, ?, ?)
       RETURNING id`
    );
    const record = await statement.bind(slug, displayName, totalTracks, operatingHours).first<{ id: number }>();
    if (!record) {
      throw new Error('Failed to insert range fixture');
    }
    return record.id;
  };

  const insertFiringLine = async (rangeId: number, tracksCount = 6, name = 'Line 1'): Promise<number> => {
    const statement = dbHandle.d1.prepare(
      `INSERT INTO ranges_firing_lines (range_id, name, tracks_count, length_meters, sort_order)
       VALUES (?, ?, ?, 25, 1)
       RETURNING id`
    );
    const record = await statement.bind(rangeId, name, tracksCount).first<{ id: number }>();
    if (!record) {
      throw new Error('Failed to insert firing line fixture');
    }
    return record.id;
  };

  const insertProposition = async (overrides: Partial<typeof defaultProposition> = {}): Promise<PropositionRow> => {
    const data = { ...defaultProposition, ...overrides };
    const statement = dbHandle.d1.prepare(
      `INSERT INTO reservations_propositions
        (user_id, range_id, status, event_date, start_time, end_time, firing_line_id, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING
         id,
         user_id,
         range_id,
         status,
         event_date,
         start_time,
         end_time,
         firing_line_id,
         metadata_json,
         EXISTS (
           SELECT 1
           FROM users_user_global_roles ugr
           JOIN users_roles ur ON ur.id = ugr.role_id
           WHERE ugr.user_id = reservations_propositions.user_id
             AND ur.name = 'Member'
         ) AS is_member`
    );
    const record = await statement
      .bind(
        data.user_id,
        data.range_id,
        data.status,
        data.event_date,
        data.start_time,
        data.end_time,
        data.firing_line_id || defaultFiringLineId,
        data.metadata_json
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
        (proposition_id, range_id, approved_by_admin_id, event_date, start_time, end_time, firing_line_id, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id, proposition_id, range_id, approved_by_admin_id, event_date, start_time, end_time, firing_line_id, metadata_json`
    );
    const record = await statement
      .bind(
        data.proposition_id,
        data.range_id,
        data.approved_by_admin_id,
        data.event_date,
        data.start_time,
        data.end_time,
        data.firing_line_id || defaultFiringLineId,
        data.metadata_json
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
    const line = await dbHandle.d1
      .prepare('SELECT id FROM ranges_firing_lines WHERE range_id = 1 ORDER BY sort_order, id LIMIT 1')
      .first<{ id: number }>();
    if (!line) {
      throw new Error('Missing firing line fixture for range 1');
    }
    defaultFiringLineId = line.id;
  });

  afterEach(() => {
    dbHandle.cleanup();
  });

  it('getPropositions filters by range and date window', async () => {
    const matching = await insertProposition({ event_date: '2024-03-10' });
    await insertProposition({ event_date: '2024-04-01' });

    const otherRangeId = await insertRange('krakow', 'Strzelnica Kraków', 6);
    const otherLineId = await insertFiringLine(otherRangeId, 6);
    await dbHandle.d1
      .prepare(
        `INSERT INTO reservations_propositions
          (user_id, range_id, status, event_date, start_time, end_time, firing_line_id, metadata_json)
         VALUES (2, ?, 'open', '2024-03-15', '10:00', '11:00', ?, '{"trackNos":[1,2]}')`
      )
      .bind(otherRangeId, otherLineId)
      .run();

    const result = await repository.getPropositions(1, '2024-03-01', '2024-03-31');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: matching.id,
      range_id: 1,
      status: 'open',
      event_date: '2024-03-10',
      firing_line_id: defaultFiringLineId,
    });
    expect(result[0].is_member).toBe(true);
  });

  it('getReservations returns reservations for range and window', async () => {
    const expected = await insertReservation({ event_date: '2024-05-10' });
    await insertReservation({ event_date: '2024-06-01' });
    const otherRangeId = await insertRange('poznan', 'Strzelnica Poznań', 5);
    const otherLineId = await insertFiringLine(otherRangeId, 5);
    await insertReservation({ range_id: otherRangeId, firing_line_id: otherLineId, event_date: '2024-05-15' });

    const reservations = await repository.getReservations(1, '2024-05-01', '2024-05-31');

    expect(reservations).toHaveLength(1);
    expect(reservations[0]).toMatchObject({
      id: expected.id,
      range_id: 1,
      firing_line_id: defaultFiringLineId,
      approved_by_admin_id: 2,
    });
  });

  it('getPropositions returns only open propositions in selected range/date window', async () => {
    const openProposition = await insertProposition({
      event_date: '2024-03-12',
      status: 'open',
    });
    await insertProposition({
      event_date: '2024-03-12',
      status: 'converted',
    });
    await insertProposition({
      event_date: '2024-03-12',
      status: 'cancelled',
    });

    const propositions = await repository.getPropositions(1, '2024-03-01', '2024-03-31');

    expect(propositions).toHaveLength(1);
    expect(propositions[0]).toMatchObject({
      id: openProposition.id,
      status: 'open',
      range_id: 1,
      event_date: '2024-03-12',
    });
  });

  it('createProposition inserts and returns new entity', async () => {
    const proposition = await repository.createProposition({
      user_id: 3,
      range_id: 1,
      event_date: '2024-10-01',
      start_time: '10:00',
      end_time: '11:00',
      firing_line_id: defaultFiringLineId,
      metadata_json: JSON.stringify({ trackNos: [1], hasCoordinatorLicenseInGroup: false }),
    });

    expect(proposition).toMatchObject({
      id: expect.any(Number),
      status: 'open',
      user_id: 3,
      range_id: 1,
      firing_line_id: defaultFiringLineId,
    });
    expect(JSON.parse(proposition.metadata_json)).toEqual({
      trackNos: [1],
      hasCoordinatorLicenseInGroup: false,
    });
  });

  it('getPropositionById returns proposition or null', async () => {
    const proposition = await insertProposition({ event_date: '2024-11-01' });
    const stored = await repository.getPropositionById(proposition.id);
    expect(stored?.id).toBe(proposition.id);
    expect(stored?.firing_line_id).toBe(defaultFiringLineId);

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
      approved_by_admin_id: 2,
      event_date: '2025-01-05',
      start_time: '12:00',
      end_time: '13:00',
      firing_line_id: defaultFiringLineId,
      metadata_json: JSON.stringify({ trackNos: [1, 2, 3] }),
    });

    expect(reservation).toMatchObject({
      id: expect.any(Number),
      proposition_id: null,
      approved_by_admin_id: 2,
      firing_line_id: defaultFiringLineId,
    });
  });

  it('createReservationFromProposition converts proposition and returns reservation', async () => {
    const proposition = await insertProposition();
    const reservation = await repository.createReservationFromProposition(
      {
        proposition_id: proposition.id,
        range_id: 1,
        approved_by_admin_id: 2,
        event_date: proposition.event_date,
        start_time: proposition.start_time,
        end_time: proposition.end_time,
        firing_line_id: defaultFiringLineId,
        metadata_json: proposition.metadata_json,
      },
      proposition.id
    );

    expect(reservation.proposition_id).toBe(proposition.id);
    expect(reservation.approved_by_admin_id).toBe(2);

    const storedProposition = await repository.getPropositionById(proposition.id);
    expect(storedProposition?.status).toBe('converted');
  });

  it('getReservationById returns reservation or null', async () => {
    const reservation = await insertReservation();
    const stored = await repository.getReservationById(reservation.id);
    expect(stored?.id).toBe(reservation.id);
    expect(stored?.firing_line_id).toBe(defaultFiringLineId);

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

  it('reopenProposition transitions converted proposition back to open', async () => {
    const proposition = await insertProposition({ status: 'converted' });

    const reopened = await repository.reopenProposition(proposition.id);

    expect(reopened?.id).toBe(proposition.id);
    expect(reopened?.status).toBe('open');
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
