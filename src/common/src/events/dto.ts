import { Event, EventAudience, EventCapacityType, EventGuestPolicy, EventRegistrationType, EventStatus } from './model';

export type CreateEventCommand = {
  rangeId: Event['range_id'];
  name: Event['name'];
  publicDescription: Event['public_description'];
  memberDescription?: Event['member_description'];
  eventDate: Event['event_date'];
  startTime: Event['start_time'];
  endTime: Event['end_time'];
  registrationType: Event['registration_type'];
  audience: Event['audience'];
  capacityType: Event['capacity_type'];
  capacityLimit?: Event['capacity_limit'];
  guestPolicy?: Event['guest_policy'];
  waitlistLimit?: Event['waitlist_limit'];
  registrationDeadline?: Event['registration_deadline'];
};

export type UpdateEventCommand = {
  name?: Event['name'];
  publicDescription?: Event['public_description'];
  memberDescription?: Event['member_description'];
  eventDate?: Event['event_date'];
  startTime?: Event['start_time'];
  endTime?: Event['end_time'];
  registrationType?: Event['registration_type'];
  audience?: Event['audience'];
  capacityType?: Event['capacity_type'];
  capacityLimit?: Event['capacity_limit'];
  guestPolicy?: Event['guest_policy'];
  waitlistLimit?: Event['waitlist_limit'];
  registrationDeadline?: Event['registration_deadline'];
  status?: Event['status'];
};

export type EventSummaryDto = {
  id: Event['id'];
  rangeId: Event['range_id'];
  name: Event['name'];
  eventDate: Event['event_date'];
  startTime: Event['start_time'];
  endTime: Event['end_time'];
  registrationType: EventRegistrationType;
  audience: EventAudience;
  capacityType: EventCapacityType;
  status: EventStatus;
};

export type EventDetailsDto = {
  id: Event['id'];
  rangeId: Event['range_id'];
  createdBy: Event['created_by'];
  name: Event['name'];
  publicDescription: Event['public_description'];
  memberDescription: Event['member_description'];
  eventDate: Event['event_date'];
  startTime: Event['start_time'];
  endTime: Event['end_time'];
  registrationType: EventRegistrationType;
  audience: EventAudience;
  capacityType: EventCapacityType;
  capacityLimit: Event['capacity_limit'];
  guestPolicy: EventGuestPolicy | null;
  waitlistLimit: Event['waitlist_limit'];
  registrationDeadline: Event['registration_deadline'];
  status: EventStatus;
  createdAt: Event['created_at'];
  updatedAt: Event['updated_at'];
};

export type EventsListResponseDto = {
  data: EventSummaryDto[];
};
