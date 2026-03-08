export interface Proposition {
  id: number;
  user_id: number;
  range_id: number;
  status: 'open' | 'converted' | 'cancelled';
  event_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  firing_line_id: number;
  metadata_json: string;
  created_at: string;
}

export interface Reservation {
  id: number;
  proposition_id: number | null;
  approved_by_admin_id: number;
  range_id: number;
  event_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  firing_line_id: number;
  metadata_json: string;
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
