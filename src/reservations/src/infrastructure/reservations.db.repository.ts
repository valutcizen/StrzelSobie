import { IDatabase } from '@strzel-sobie/common';
import {
  CreatePropositionRecord,
  CreateRecordData,
  CreateReservationRecord,
  IReservationsRepository,
  OverlappingUsage,
  Proposition,
  RecordEntity,
  Reservation,
  ReservationConflict,
} from '../domain/reservations.repository';

type PropositionDb = {
  id: number;
  user_id: number;
  range_id: number;
  status: 'open' | 'converted' | 'cancelled';
  event_date: string;
  start_time: string;
  end_time: string;
  num_participants: number;
  tracks_requested: number;
  is_member: number;
};

type ReservationDb = {
  id: number;
  proposition_id: number | null;
  range_id: number;
  coordinator_id: number;
  event_date: string;
  start_time: string;
  end_time: string;
  tracks_requested: number;
  is_public: number;
  is_joinable: number;
  num_participants: number;
};

type RecordDb = {
  id: number;
  admin_id: number;
  range_id: number;
  event_date: string;
  start_time: string;
  end_time: string;
  num_participants: number;
  created_at: string;
};

type ConflictRow = {
  id: number;
  event_date: string;
  start_time: string;
  end_time: string;
  tracks_requested: number;
};

const mapDbProposition = (dbProposition: PropositionDb): Proposition => ({
  id: dbProposition.id,
  user_id: dbProposition.user_id,
  range_id: dbProposition.range_id,
  status: dbProposition.status,
  event_date: dbProposition.event_date,
  start_time: dbProposition.start_time,
  end_time: dbProposition.end_time,
  num_participants: dbProposition.num_participants,
  tracks_requested: dbProposition.tracks_requested,
  is_member: Boolean(dbProposition.is_member),
});

const normalizeFlag = (value: number | string | boolean): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    return numeric === 1;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return false;
};

const mapDbReservation = (dbReservation: ReservationDb): Reservation => ({
  id: dbReservation.id,
  proposition_id: dbReservation.proposition_id,
  range_id: dbReservation.range_id,
  coordinator_id: dbReservation.coordinator_id,
  event_date: dbReservation.event_date,
  start_time: dbReservation.start_time,
  end_time: dbReservation.end_time,
  num_participants: dbReservation.num_participants,
  tracks_requested: dbReservation.tracks_requested,
  is_public: normalizeFlag(dbReservation.is_public),
  is_joinable: normalizeFlag(dbReservation.is_joinable),
});

const mapDbRecord = (dbRecord: RecordDb): RecordEntity => ({
  id: dbRecord.id,
  admin_id: dbRecord.admin_id,
  range_id: dbRecord.range_id,
  event_date: dbRecord.event_date,
  start_time: dbRecord.start_time,
  end_time: dbRecord.end_time,
  num_participants: dbRecord.num_participants,
  created_at: dbRecord.created_at,
});

export class ReservationsDbRepository implements IReservationsRepository {
  constructor(private readonly db: IDatabase) {}

  public async getPropositions(rangeId: number, startDate: string, endDate: string): Promise<Proposition[]> {
    const stmt = this.db.prepare(
      `SELECT
          rp.id,
          rp.user_id,
          rp.range_id,
          rp.status,
          rp.event_date,
          rp.start_time,
          rp.end_time,
          rp.num_participants,
          rp.tracks_requested,
          EXISTS (
            SELECT 1
            FROM users_user_global_roles ugr
            JOIN users_roles ur ON ur.id = ugr.role_id
            WHERE ugr.user_id = rp.user_id
              AND ur.name = 'Member'
          ) AS is_member
       FROM reservations_propositions rp
       WHERE range_id = ? AND event_date BETWEEN ? AND ?`
    );
    const { results } = await stmt.bind(rangeId, startDate, endDate).all<PropositionDb>();

    return (results ?? []).map(mapDbProposition);
  }

  public async getReservations(rangeId: number, startDate: string, endDate: string): Promise<Reservation[]> {
    const stmt = this.db.prepare(
      `SELECT id, proposition_id, range_id, coordinator_id, event_date, start_time, end_time, tracks_requested, is_public, is_joinable, num_participants
       FROM reservations_reservations
       WHERE range_id = ? AND event_date BETWEEN ? AND ?`
    );
    const { results } = await stmt.bind(rangeId, startDate, endDate).all<ReservationDb>();

    return (results ?? []).map(mapDbReservation);
  }

  public async getOverlappingUsage(
    rangeId: number,
    eventDate: string,
    startTime: string,
    endTime: string
  ): Promise<OverlappingUsage> {
    const stmt = this.db.prepare(
      `SELECT
        COALESCE((
          SELECT SUM(tracks_requested)
          FROM reservations_propositions
          WHERE range_id = ?
            AND event_date = ?
            AND status = 'open'
            AND start_time < ?
            AND end_time > ?
        ), 0) AS propositions_tracks,
        COALESCE((
          SELECT SUM(tracks_requested)
          FROM reservations_reservations
          WHERE range_id = ?
            AND event_date = ?
            AND start_time < ?
            AND end_time > ?
        ), 0) AS reservations_tracks`
    );

    const usage = await stmt
      .bind(rangeId, eventDate, endTime, startTime, rangeId, eventDate, endTime, startTime)
      .first<{ propositions_tracks: number | null; reservations_tracks: number | null }>();

    return {
      propositions_tracks: usage?.propositions_tracks ?? 0,
      reservations_tracks: usage?.reservations_tracks ?? 0,
    };
  }

  public async getOverlappingReservationsDetails(
    rangeId: number,
    eventDate: string,
    startTime: string,
    endTime: string,
    options?: { excludeReservationId?: number; excludePropositionId?: number }
  ): Promise<ReservationConflict[]> {
    const conflicts: ReservationConflict[] = [];
    const excludeReservationId = options?.excludeReservationId;
    const excludePropositionId = options?.excludePropositionId;

    const reservationSql = `
      SELECT id, event_date, start_time, end_time, tracks_requested
      FROM reservations_reservations
      WHERE range_id = ?
        AND event_date = ?
        AND start_time < ?
        AND end_time > ?
        ${excludeReservationId ? 'AND id != ?' : ''}
    `;
    const reservationBindings: Array<number | string> = [rangeId, eventDate, endTime, startTime];
    if (excludeReservationId) {
      reservationBindings.push(excludeReservationId);
    }
    const reservationStmt = this.db.prepare(reservationSql);
    const reservationResults = await reservationStmt.bind(...reservationBindings).all<ConflictRow>();
    conflicts.push(
      ...((reservationResults.results ?? []).map((row) => ({
        id: row.id,
        type: 'reservation' as const,
        event_date: row.event_date,
        start_time: row.start_time,
        end_time: row.end_time,
        tracks_requested: row.tracks_requested,
      })))
    );

    const propositionSql = `
      SELECT id, event_date, start_time, end_time, tracks_requested
      FROM reservations_propositions
      WHERE range_id = ?
        AND status = 'open'
        AND event_date = ?
        AND start_time < ?
        AND end_time > ?
        ${excludePropositionId ? 'AND id != ?' : ''}
    `;
    const propositionBindings: Array<number | string> = [rangeId, eventDate, endTime, startTime];
    if (excludePropositionId) {
      propositionBindings.push(excludePropositionId);
    }
    const propositionStmt = this.db.prepare(propositionSql);
    const propositionResults = await propositionStmt.bind(...propositionBindings).all<ConflictRow>();
    conflicts.push(
      ...((propositionResults.results ?? []).map((row) => ({
        id: row.id,
        type: 'proposition' as const,
        event_date: row.event_date,
        start_time: row.start_time,
        end_time: row.end_time,
        tracks_requested: row.tracks_requested,
      })))
    );

    return conflicts;
  }

  public async createProposition(record: CreatePropositionRecord): Promise<Proposition> {
    const stmt = this.db.prepare(
      `INSERT INTO reservations_propositions
        (user_id, range_id, status, event_date, start_time, end_time, num_participants, tracks_requested)
       VALUES (?, ?, 'open', ?, ?, ?, ?, ?)
       RETURNING
         id,
         user_id,
         range_id,
         status,
         event_date,
         start_time,
         end_time,
         num_participants,
         tracks_requested,
         EXISTS (
           SELECT 1
           FROM users_user_global_roles ugr
           JOIN users_roles ur ON ur.id = ugr.role_id
           WHERE ugr.user_id = reservations_propositions.user_id
             AND ur.name = 'Member'
         ) AS is_member`
    );

    const result = await stmt
      .bind(
        record.user_id,
        record.range_id,
        record.event_date,
        record.start_time,
        record.end_time,
        record.num_participants,
        record.tracks_requested
      )
      .first<PropositionDb>();

    if (!result) {
      throw new Error('Failed to create proposition');
    }

    return mapDbProposition(result);
  }

  public async createReservation(record: CreateReservationRecord): Promise<Reservation> {
    return this.insertReservation(record);
  }

  public async createReservationFromProposition(
    record: CreateReservationRecord,
    propositionId: number
  ): Promise<Reservation> {
    await this.db.prepare('BEGIN').run();
    try {
      const reservation = await this.insertReservation({
        ...record,
        proposition_id: propositionId,
      });

      const updateResult = await this.db
        .prepare(
          `UPDATE reservations_propositions
           SET status = 'converted'
           WHERE id = ?
           RETURNING id`
        )
        .bind(propositionId)
        .first<{ id: number }>();

      if (!updateResult) {
        throw new Error('Failed to mark proposition as converted');
      }

      await this.db.prepare('COMMIT').run();
      return reservation;
    } catch (error) {
      try {
        await this.db.prepare('ROLLBACK').run();
      } catch (rollbackError) {
        console.error('Failed to rollback reservation creation transaction', rollbackError);
      }
      throw error;
    }
  }

  public async markPropositionConverted(propositionId: number): Promise<void> {
    const updateResult = await this.db
      .prepare(
        `UPDATE reservations_propositions
         SET status = 'converted'
         WHERE id = ?
         RETURNING id`
      )
      .bind(propositionId)
      .first<{ id: number }>();

    if (!updateResult) {
      throw new Error('Failed to mark proposition as converted');
    }
  }

  public async getPropositionById(id: number): Promise<Proposition | null> {
    const stmt = this.db.prepare(
      `SELECT
          rp.id,
          rp.user_id,
          rp.range_id,
          rp.status,
          rp.event_date,
          rp.start_time,
          rp.end_time,
          rp.num_participants,
          rp.tracks_requested,
          EXISTS (
            SELECT 1
            FROM users_user_global_roles ugr
            JOIN users_roles ur ON ur.id = ugr.role_id
            WHERE ugr.user_id = rp.user_id
              AND ur.name = 'Member'
          ) AS is_member
       FROM reservations_propositions rp
       WHERE id = ?`
    );

    const record = await stmt.bind(id).first<PropositionDb>();

    if (!record) {
      return null;
    }

    return mapDbProposition(record);
  }

  public async cancelProposition(id: number): Promise<Proposition | null> {
    const stmt = this.db.prepare(
      `UPDATE reservations_propositions
       SET status = 'cancelled'
       WHERE id = ? AND status = 'open'
       RETURNING
         id,
         user_id,
         range_id,
         status,
         event_date,
         start_time,
         end_time,
         num_participants,
         tracks_requested,
         EXISTS (
           SELECT 1
           FROM users_user_global_roles ugr
           JOIN users_roles ur ON ur.id = ugr.role_id
           WHERE ugr.user_id = reservations_propositions.user_id
             AND ur.name = 'Member'
         ) AS is_member`
    );

    const record = await stmt.bind(id).first<PropositionDb>();

    if (!record) {
      return null;
    }

    return mapDbProposition(record);
  }

  public async getReservationById(id: number): Promise<Reservation | null> {
    const stmt = this.db.prepare(
      `SELECT id, proposition_id, range_id, coordinator_id, event_date, start_time, end_time, num_participants, tracks_requested, is_public, is_joinable
       FROM reservations_reservations
       WHERE id = ?`
    );

    const record = await stmt.bind(id).first<ReservationDb>();

    if (!record) {
      return null;
    }

    return mapDbReservation(record);
  }

  public async deleteReservation(id: number): Promise<Reservation | null> {
    const stmt = this.db.prepare(
      `DELETE FROM reservations_reservations
       WHERE id = ?
       RETURNING id, proposition_id, range_id, coordinator_id, event_date, start_time, end_time, num_participants, tracks_requested, is_public, is_joinable`
    );

    const record = await stmt.bind(id).first<ReservationDb>();

    if (!record) {
      return null;
    }

    return mapDbReservation(record);
  }

  public async createRecord(data: CreateRecordData): Promise<RecordEntity> {
    const stmt = this.db.prepare(
      `INSERT INTO reservations_records
        (range_id, admin_id, event_date, start_time, end_time, num_participants)
       VALUES (?, ?, ?, ?, ?, ?)
       RETURNING id, admin_id, range_id, event_date, start_time, end_time, num_participants, created_at`
    );

    const record = await stmt
      .bind(
        data.range_id,
        data.admin_id,
        data.event_date,
        data.start_time,
        data.end_time,
        data.num_participants
      )
      .first<RecordDb>();

    if (!record) {
      throw new Error('Failed to create record');
    }

    return mapDbRecord(record);
  }

  private async insertReservation(record: CreateReservationRecord): Promise<Reservation> {
    const propositionId = record.proposition_id ?? null;
    const stmt = this.db.prepare(
      `INSERT INTO reservations_reservations
        (proposition_id, coordinator_id, range_id, event_date, start_time, end_time, num_participants, tracks_requested, is_public, is_joinable)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id, proposition_id, range_id, coordinator_id, event_date, start_time, end_time, num_participants, tracks_requested, is_public, is_joinable`
    );

    const created = await stmt
      .bind(
        propositionId,
        record.coordinator_id,
        record.range_id,
        record.event_date,
        record.start_time,
        record.end_time,
        record.num_participants,
        record.tracks_requested,
        record.is_public ? 1 : 0,
        record.is_joinable ? 1 : 0
      )
      .first<ReservationDb>();

    if (!created) {
      throw new Error('Failed to create reservation');
    }

    return mapDbReservation(created);
  }
}
