import { Reservation, Proposition } from '../models/reservations.models';

/**
 * Command model for creating a new reservation directly.
 * Corresponds to the request payload for `POST /api/v1/ranges/{rangeSlug}/reservations`.
 */
export type CreateReservationCommand = {
  eventDate: Reservation['event_date'];
  startTime: Reservation['start_time'];
  endTime: Reservation['end_time'];
  numParticipants: Reservation['num_participants'];
  tracksRequested: Reservation['tracks_requested'];
  isPublic: boolean;
  isJoinable: boolean;
};

/**
 * Command model for creating a reservation from an existing proposition.
 * Corresponds to the request payload for `POST /api/v1/ranges/{rangeSlug}/reservations`.
 */
export type CreateReservationFromPropositionCommand = {
  propositionId: Proposition['id'];
  startTime?: Reservation['start_time'];
  endTime?: Reservation['end_time'];
  tracksRequested?: Reservation['tracks_requested'];
};

/**
 * DTO for a newly created reservation.
 * Corresponds to the response payload for `POST /api/v1/ranges/{rangeSlug}/reservations`.
 */
export type CreatedReservationDto = Pick<Reservation, 'id' | 'range_id' | 'coordinator_id'>;
