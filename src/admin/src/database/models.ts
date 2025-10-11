export interface ShootingRange {
  id: number;
  slug: string;
  display_name: string;
  total_tracks: number;
  operating_hours: string; // JSON object
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  action_type: string;
  target_id: number | null;
  details: string | null; // JSON object
  event_timestamp: string;
}
