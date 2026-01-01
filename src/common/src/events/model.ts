export enum EventRegistrationType {
  Notice = 'notice',
  RegistrationRequired = 'registration_required',
}

export enum EventAudience {
  Public = 'public',
  MembersOnly = 'members_only',
}

export enum EventCapacityType {
  Unlimited = 'unlimited',
  Limited = 'limited',
}

export enum EventGuestPolicy {
  GuestsAllowed = 'guests_allowed',
  NoGuests = 'no_guests',
}

export enum EventStatus {
  Active = 'active',
  Cancelled = 'cancelled',
}

export interface Event {
  id: number;
  range_id: number;
  created_by: number;
  name: string;
  public_description: string;
  member_description: string | null;
  event_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  registration_type: EventRegistrationType;
  audience: EventAudience;
  capacity_type: EventCapacityType;
  capacity_limit: number | null;
  guest_policy: EventGuestPolicy | null;
  waitlist_limit: number | null;
  registration_deadline: string | null;
  status: EventStatus;
  created_at: string;
  updated_at: string | null;
}
