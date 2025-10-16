export interface Proposition {
  id: number;
  user_id: number;
  range_id: number;
  status: 'open' | 'converted' | 'cancelled';
  event_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  num_participants: number;
  tracks_requested: number;
  created_at: string;
}

export interface Reservation {
  id: number;
  proposition_id: number | null;
  coordinator_id: number;
  range_id: number;
  event_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  num_participants: number;
  tracks_requested: number;
  is_public: 0 | 1;
  is_joinable: 0 | 1;
  created_at: string;
}

export interface Record {
  id: number;
  admin_id: number;
  range_id: number;
  event_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  num_participants: number;
  created_at: string;
}
