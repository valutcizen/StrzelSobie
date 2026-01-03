import {
  EventAudience,
  EventCapacityType,
  EventGuestPolicy,
  EventRegistrationType,
  EventSignupStatus,
  EventStatus,
} from '@strzel-sobie/common/models';

export type EventRecord = {
  id: number;
  range_id: number;
  created_by: number;
  name: string;
  public_description: string;
  member_description: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
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
};

export type EventParticipantRecord = {
  user_id: number;
  user_email: string | null;
  user_display_name: string | null;
  guests: number;
  signup_time: string;
};

export type EventSignupRecord = {
  id: number;
  event_id: number;
  user_id: number;
  guests: number;
  status: EventSignupStatus;
  created_at: string;
  updated_at: string | null;
};

export type EventSignupSummary = {
  confirmedSlots: number;
  waitlistedSlots: number;
};

export type CreateEventRecord = Omit<
  EventRecord,
  'id' | 'created_at' | 'updated_at'
>;

export type UpdateEventRecord = Partial<Omit<EventRecord, 'id' | 'created_at'>>;

export type CreateEventSignupRecord = {
  event_id: number;
  user_id: number;
  guests: number;
  status: EventSignupRecord['status'];
};

export interface IEventsRepository {
  getRangeEvents(rangeId: number): Promise<EventRecord[]>;
  getEventById(eventId: number): Promise<EventRecord | null>;
  getEventParticipants(eventId: number): Promise<EventParticipantRecord[]>;
  getEventWaitlist(eventId: number): Promise<EventParticipantRecord[]>;
  createEvent(record: CreateEventRecord): Promise<EventRecord>;
  updateEvent(eventId: number, record: UpdateEventRecord): Promise<EventRecord | null>;
  cancelEvent(eventId: number): Promise<EventRecord | null>;
  getSignupByUser(eventId: number, userId: number): Promise<EventSignupRecord | null>;
  getSignupSummary(eventId: number): Promise<EventSignupSummary>;
  createSignup(record: CreateEventSignupRecord): Promise<EventSignupRecord>;
  updateSignup(eventId: number, userId: number, guests: number): Promise<EventSignupRecord | null>;
  deleteSignup(eventId: number, userId: number): Promise<EventSignupRecord | null>;
  promoteWaitlistedSignup(eventId: number, slotsAvailable: number): Promise<EventSignupRecord | null>;
}
