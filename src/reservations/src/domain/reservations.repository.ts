export type Proposition = {
  id: number;
  user_id: number;
  range_id: number;
  status: 'open' | 'converted' | 'cancelled';
  event_date: string;
  start_time: string;
  end_time: string;
  num_participants: number;
  tracks: number;
};

export type Reservation = {
  id: number;
  range_id: number;
  coordinator_id: number;
  event_date: string;
  start_time: string;
  end_time: string;
  tracks: number;
  is_public: boolean;
  is_joinable: boolean;
  participants_count: number;
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

export interface IReservationsRepository {
  getPropositions(rangeId: number, startDate: string, endDate: string): Promise<Proposition[]>;
  getReservations(rangeId: number, startDate: string, endDate: string): Promise<Reservation[]>;
  getOverlappingUsage(
    rangeId: number,
    eventDate: string,
    startTime: string,
    endTime: string
  ): Promise<OverlappingUsage>;
  createProposition(record: CreatePropositionRecord): Promise<Proposition>;
  getPropositionById(id: number): Promise<Proposition | null>;
  cancelProposition(id: number): Promise<Proposition | null>;
}
