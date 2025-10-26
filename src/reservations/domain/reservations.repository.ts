import { Result } from '@strzel-sobie/common';

export type Proposition = {
  id: number;
  user_id: number;
  range_id: number;
  status: 'open' | 'converted' | 'cancelled';
  event_date: string;
  start_time: string;
  end_time: string;
  num_participants: number;
  tracks_requested: number;
  is_member: boolean;
};

export type Reservation = {
  id: number;
  range_id: number;
  coordinator_id: number;
  proposition_id: number | null;
  event_date: string;
  start_time: string;
  end_time: string;
  num_participants: number;
  tracks_requested: number;
  is_public: boolean;
  is_joinable: boolean;
};

export type ReservationConflict = {
  id: number;
  type: 'reservation' | 'proposition';
  event_date: string;
  start_time: string;
  end_time: string;
  tracks_requested: number;
};

export type CreateReservationRecord = {
  range_id: number;
  coordinator_id: number;
  proposition_id: number | null;
  event_date: string;
  start_time: string;
  end_time: string;
  num_participants: number;
  tracks_requested: number;
  is_public: boolean;
  is_joinable: boolean;
};

export interface IReservationsRepository {
  getPropositions(
    rangeId: number,
    startDate: string,
    endDate: string
  ): Promise<Result<Proposition[], Error>>;
  getReservations(
    rangeId: number,
    startDate: string,
    endDate: string
  ): Promise<Result<Reservation[], Error>>;
  getOverlappingReservationsDetails(
    rangeId: number,
    eventDate: string,
    startTime: string,
    endTime: string,
    options?: { excludeReservationId?: number; excludePropositionId?: number }
  ): Promise<Result<ReservationConflict[], Error>>;
  createReservation(record: CreateReservationRecord): Promise<Result<Reservation, Error>>;
  createReservationFromProposition(
    record: CreateReservationRecord,
    propositionId: number
  ): Promise<Result<Reservation, Error>>;
  markPropositionConverted(propositionId: number): Promise<Result<void, Error>>;
}
