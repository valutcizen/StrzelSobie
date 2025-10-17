import { IDatabase } from '@strzel-sobie/common';
import {
  CreatePropositionRecord,
  IReservationsRepository,
  OverlappingUsage,
  Proposition,
  Reservation,
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
};

type ReservationDb = {
  id: number;
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

const mapDbProposition = (dbProposition: PropositionDb): Proposition => ({
  id: dbProposition.id,
  user_id: dbProposition.user_id,
  range_id: dbProposition.range_id,
  status: dbProposition.status,
  event_date: dbProposition.event_date,
  start_time: dbProposition.start_time,
  end_time: dbProposition.end_time,
  num_participants: dbProposition.num_participants,
  tracks: dbProposition.tracks_requested,
});

export class ReservationsDbRepository implements IReservationsRepository {
  constructor(private readonly db: IDatabase) {}

  public async getPropositions(rangeId: number, startDate: string, endDate: string): Promise<Proposition[]> {
    const stmt = this.db.prepare(
      `SELECT id, user_id, range_id, status, event_date, start_time, end_time, num_participants, tracks_requested
       FROM reservations_propositions
       WHERE range_id = ? AND event_date BETWEEN ? AND ?`
    );
    const { results } = await stmt.bind(rangeId, startDate, endDate).all<PropositionDb>();

    return (results ?? []).map(mapDbProposition);
  }

  public async getReservations(rangeId: number, startDate: string, endDate: string): Promise<Reservation[]> {
    const stmt = this.db.prepare(
      'SELECT id, range_id, coordinator_id, event_date, start_time, end_time, tracks_requested, is_public, is_joinable, num_participants FROM reservations_reservations WHERE range_id = ? AND event_date BETWEEN ? AND ?'
    );
    const { results } = await stmt.bind(rangeId, startDate, endDate).all<ReservationDb>();

    const domainReservations = (results ?? []).map((dbReservation) => ({
      id: dbReservation.id,
      range_id: dbReservation.range_id,
      coordinator_id: dbReservation.coordinator_id,
      event_date: dbReservation.event_date,
      start_time: dbReservation.start_time,
      end_time: dbReservation.end_time,
      tracks: dbReservation.tracks_requested,
      is_public: !!dbReservation.is_public,
      is_joinable: !!dbReservation.is_joinable,
      participants_count: dbReservation.num_participants,
    }));

    return domainReservations;
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

  public async createProposition(record: CreatePropositionRecord): Promise<Proposition> {
    const stmt = this.db.prepare(
      `INSERT INTO reservations_propositions
        (user_id, range_id, status, event_date, start_time, end_time, num_participants, tracks_requested)
       VALUES (?, ?, 'open', ?, ?, ?, ?, ?)
       RETURNING id, user_id, range_id, status, event_date, start_time, end_time, num_participants, tracks_requested`
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

  public async getPropositionById(id: number): Promise<Proposition | null> {
    const stmt = this.db.prepare(
      `SELECT id, user_id, range_id, status, event_date, start_time, end_time, num_participants, tracks_requested
       FROM reservations_propositions
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
       RETURNING id, user_id, range_id, status, event_date, start_time, end_time, num_participants, tracks_requested`
    );

    const record = await stmt.bind(id).first<PropositionDb>();

    if (!record) {
      return null;
    }

    return mapDbProposition(record);
  }
}
