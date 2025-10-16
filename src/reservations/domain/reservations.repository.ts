import { Result } from '@strzel-sobie/common';

export type Proposition = {
  id: number;
  user_id: number;
  range_id: number;
  event_date: string;
  start_time: string;
  end_time: string;
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

export interface IReservationsRepository {
  getPropositions(rangeId: string, startDate: string, endDate: string): Promise<Result<Proposition[], Error>>;
  getReservations(rangeId: string, startDate: string, endDate: string): Promise<Result<Reservation[], Error>>;
}
