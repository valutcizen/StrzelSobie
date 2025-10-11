import { Proposition, Reservation } from '../models/reservations.models';

/**
 * DTO for a proposition displayed on the calendar.
 * Part of the `GET /api/v1/ranges/{rangeSlug}/events` response.
 * Maps entity properties to camelCase.
 */
export type PropositionCalendarEntryDto = {
  id: Proposition['id'];
  userId: Proposition['user_id'];
  isMember: boolean; // Derived property to highlight for coordinators
  eventDate: Proposition['event_date'];
  startTime: Proposition['start_time'];
  endTime: Proposition['end_time'];
  tracksRequested: Proposition['tracks_requested'];
};

/**
 * DTO for a reservation displayed on the calendar.
 * Part of the `GET /api/v1/ranges/{rangeSlug}/events` response.
 * Maps entity properties to camelCase and converts boolean-like numbers to booleans.
 */
export type ReservationCalendarEntryDto = {
  id: Reservation['id'];
  eventDate: Reservation['event_date'];
  startTime: Reservation['start_time'];
  endTime: Reservation['end_time'];
  tracksRequested: Reservation['tracks_requested'];
  isPublic: boolean;
  isJoinable: boolean;
  details: {
    coordinatorId: Reservation['coordinator_id'];
    numParticipants: Reservation['num_participants'];
  } | null;
};

/**
 * DTO for all calendar events in a given date range.
 * Corresponds to the response payload for `GET /api/v1/ranges/{rangeSlug}/events`.
 */
export type CalendarEventsDto = {
  propositions: PropositionCalendarEntryDto[];
  reservations: ReservationCalendarEntryDto[];
};
