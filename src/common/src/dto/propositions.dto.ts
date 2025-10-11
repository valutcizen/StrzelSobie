import { Proposition } from '../models/reservations.models';

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
