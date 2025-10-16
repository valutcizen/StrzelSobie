import { IDatabase, Result } from '@strzel-sobie/common';
import { IReservationsRepository, Proposition, Reservation } from '../domain/reservations.repository';

type PropositionDb = {
  id: number;
  user_id: number;
  range_id: number;
  event_date: string;
  start_time: string;
  end_time: string;
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

export class ReservationsDbRepository implements IReservationsRepository {
  constructor(private readonly db: IDatabase) {}

  public async getPropositions(rangeSlug: string, startDate: string, endDate: string): Promise<Result<Proposition[], Error>> {
    try {
      const rangeStmt = this.db.prepare('SELECT id FROM ranges_shooting_ranges WHERE slug = ?');
      const rangeResult = await rangeStmt.bind(rangeSlug).first<{ id: number }>();

      if (!rangeResult) {
        return Result.ok([]);
      }

      const stmt = this.db.prepare(
        'SELECT id, user_id, range_id, event_date, start_time, end_time, tracks_requested FROM reservations_propositions WHERE range_id = ? AND event_date BETWEEN ? AND ?'
      );
      const { results } = await stmt.bind(rangeResult.id, startDate, endDate).all<PropositionDb>();

      const domainPropositions = results.map((dbProposition) => ({
        id: dbProposition.id,
        user_id: dbProposition.user_id,
        range_id: dbProposition.range_id,
        event_date: dbProposition.event_date,
        start_time: dbProposition.start_time,
        end_time: dbProposition.end_time,
        tracks: dbProposition.tracks_requested,
      }));

      return Result.ok(domainPropositions);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  public async getReservations(rangeSlug: string, startDate: string, endDate: string): Promise<Result<Reservation[], Error>> {
    try {
      const rangeStmt = this.db.prepare('SELECT id FROM ranges_shooting_ranges WHERE slug = ?');
      const rangeResult = await rangeStmt.bind(rangeSlug).first<{ id: number }>();

      if (!rangeResult) {
        return Result.ok([]);
      }

      const stmt = this.db.prepare(
        'SELECT id, range_id, coordinator_id, event_date, start_time, end_time, tracks_requested, is_public, is_joinable, num_participants FROM reservations_reservations WHERE range_id = ? AND event_date BETWEEN ? AND ?'
      );
      const { results } = await stmt.bind(rangeResult.id, startDate, endDate).all<ReservationDb>();

      const domainReservations = results.map((dbReservation) => ({
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

      return Result.ok(domainReservations);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }
}