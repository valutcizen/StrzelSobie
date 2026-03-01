export const RANGE_TYPES = ['club', 'ally', 'coming-soon', 'meetup', 'office'] as const;
export type RangeType = (typeof RANGE_TYPES)[number];

export interface ShootingRange {
  id: number;
  slug: string;
  type: RangeType;
  allows_reservations: number;
  is_deleted: number;
  public_description: string | null;
  member_description: string | null;
  latitude: number;
  longitude: number;
  display_name: string;
  total_tracks: number | null;
  operating_hours: string; // JSON object
  extras: string; // JSON blob for optional range data
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  action_type: string;
  target_id: number | null;
  details: string | null; // JSON object
  event_timestamp: string;
}
