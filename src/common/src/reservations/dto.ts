import { Result } from '../result';
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
 * Union payload accepted by reservation creation workflow.
 * `propositionId` discriminates proposition-based conversions.
 */
export type CreateReservationPayload =
  | CreateReservationCommand
  | CreateReservationFromPropositionCommand;

export type CreateReservationOptions = {
  force: boolean;
};

export type CancelReservationCommand = {
  reservationId: Reservation['id'];
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
  propositionId: number | null;
  eventDate: string;
  startTime: string;
  endTime: string;
  tracksRequested: number | null;
  isPublic: boolean;
  isJoinable: boolean | null;
  details: {
    coordinatorId: number;
    numParticipants: number;
  } | null;
  proposition: PropositionDetailDto | null;
}

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

export type CancelPropositionCommand = {
  propositionId: Proposition['id'];
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

export type CreatedRecordDto = {
  id: RangeRecord['id'];
  rangeId: RangeRecord['range_id'];
  adminId: RangeRecord['admin_id'];
  eventDate: RangeRecord['event_date'];
  startTime: RangeRecord['start_time'];
  endTime: RangeRecord['end_time'];
  numParticipants: RangeRecord['num_participants'];
  createdAt: RangeRecord['created_at'];
};

export type CreateRecordResult = Result<CreatedRecordDto>;

export type PersonSummaryDto = {
  id: number;
  email: string | null;
  phoneNumber: string | null;
  displayName?: string | null;
};

export type PropositionDetailDto = {
  id: Proposition['id'];
  rangeId: Proposition['range_id'];
  userId: Proposition['user_id'];
  status: Proposition['status'];
  eventDate: Proposition['event_date'];
  startTime: Proposition['start_time'];
  endTime: Proposition['end_time'];
  numParticipants: Proposition['num_participants'];
  tracksRequested: Proposition['tracks_requested'];
  createdAt: string | null;
  requester: PersonSummaryDto | null;
  notes?: string | null;
};

export type ReservationDetailDto = {
  id: Reservation['id'];
  rangeId: Reservation['range_id'];
  coordinatorId: Reservation['coordinator_id'];
  propositionId: Reservation['proposition_id'];
  proposition: PropositionDetailDto | null;
  eventDate: Reservation['event_date'];
  startTime: Reservation['start_time'];
  endTime: Reservation['end_time'];
  numParticipants: Reservation['num_participants'];
  tracksRequested: Reservation['tracks_requested'];
  isPublic: boolean;
  isJoinable: boolean;
  createdAt: string | null;
  coordinator: PersonSummaryDto | null;
  notes?: string | null;
};
