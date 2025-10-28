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

export type PropositionDetail = Proposition & {
  created_at: string | null;
  requester_email: string | null;
  requester_phone_number: string | null;
};

export type ReservationDetail = Reservation & {
  created_at: string | null;
  coordinator_email: string | null;
  coordinator_phone_number: string | null;
};

export type RecordEntity = {
  id: number;
  admin_id: number;
  range_id: number;
  event_date: string;
  start_time: string;
  end_time: string;
  num_participants: number;
  created_at: string;
};

export type CreateRecordData = {
  range_id: number;
  admin_id: number;
  event_date: string;
  start_time: string;
  end_time: string;
  num_participants: number;
};

export type CreatePropositionRecord = {
  user_id: number;
  range_id: number;
  event_date: string;
  start_time: string;
  end_time: string;
  num_participants: number;
  tracks_requested: number;
};

export type OverlappingUsage = {
  propositions_tracks: number;
  reservations_tracks: number;
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
  getPropositions(rangeId: number, startDate: string, endDate: string): Promise<Proposition[]>;
  getReservations(rangeId: number, startDate: string, endDate: string): Promise<Reservation[]>;
  getOverlappingUsage(
    rangeId: number,
    eventDate: string,
    startTime: string,
    endTime: string
  ): Promise<OverlappingUsage>;
  getOverlappingReservationsDetails(
    rangeId: number,
    eventDate: string,
    startTime: string,
    endTime: string,
    options?: { excludeReservationId?: number; excludePropositionId?: number }
  ): Promise<ReservationConflict[]>;
  createProposition(record: CreatePropositionRecord): Promise<Proposition>;
  createReservation(record: CreateReservationRecord): Promise<Reservation>;
  createReservationFromProposition(record: CreateReservationRecord, propositionId: number): Promise<Reservation>;
  createRecord(data: CreateRecordData): Promise<RecordEntity>;
  markPropositionConverted(propositionId: number): Promise<void>;
  getPropositionById(id: number): Promise<Proposition | null>;
  getPropositionDetailById(id: number): Promise<PropositionDetail | null>;
  cancelProposition(id: number): Promise<Proposition | null>;
  getReservationById(id: number): Promise<Reservation | null>;
  getReservationDetailById(id: number): Promise<ReservationDetail | null>;
  deleteReservation(id: number): Promise<Reservation | null>;
  reopenProposition(id: number): Promise<Proposition | null>;
}
