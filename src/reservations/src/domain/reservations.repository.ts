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
  getPropositions(rangeId: number, startDate: string, endDate: string): Promise<Proposition[]>;
  getReservations(rangeId: number, startDate: string, endDate: string): Promise<Reservation[]>;
}
