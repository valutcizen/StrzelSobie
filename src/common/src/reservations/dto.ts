import { UserProfile } from '../users/model';
import { Reservation, Proposition, Record as RangeRecord } from './model';

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

export type PropositionEventDto = {
  id: number;
  userId: number;
  isMember: boolean; // True if the user is a club member, for UI highlighting
  eventDate: string;
  startTime: string;
  endTime: string;
  tracksRequested: number;
};

export type ReservationEventDto = {
  id: number;
  eventDate: string;
  startTime: string;
  endTime: string;
  tracksRequested: number;
  isPublic: boolean;
  isJoinable: boolean;
  details: {
    coordinatorId: number;
    numParticipants: number;
  } | null;
};

export type CalendarEventsDto = {
  propositions: PropositionEventDto[];
  reservations: ReservationEventDto[];
};

export type GetCalendarEventsQuery = {
  rangeSlug: string;
  startDate: string;
  endDate: string;
  user: UserProfile;
};
/**
 * Command model for creating a new proposition.
 * Corresponds to the request payload for `POST /api/v1/ranges/{rangeSlug}/propositions`.
 * Maps properties to camelCase.
 */
export type CreatePropositionCommand = {
  eventDate: Proposition['event_date'];
  startTime: Proposition['start_time'];
  endTime: Proposition['end_time'];
  numParticipants: Proposition['num_participants'];
  tracksRequested: Proposition['tracks_requested'];
};

/**
 * DTO for a newly created proposition.
 * Corresponds to the response payload for `POST /api/v1/ranges/{rangeSlug}/propositions`.
 * This type is a subset of the `Proposition` entity.
 */
export type CreatedPropositionDto = Pick<Proposition, 'id' | 'user_id' | 'range_id' | 'status'>;
/**
 * Command model for creating a manual record.
 * Corresponds to the request payload for `POST /api/v1/ranges/{rangeSlug}/records`.
 * Maps properties from the `Record` entity, expecting camelCase in the API.
 */
export type CreateRecordCommand = {
    eventDate: RangeRecord['event_date'];
    startTime: RangeRecord['start_time'];
    endTime: RangeRecord['end_time'];
    numParticipants: RangeRecord['num_participants'];
};