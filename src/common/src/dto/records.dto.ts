import { Record } from '../models/reservations.models';

/**
 * Command model for creating a manual record.
 * Corresponds to the request payload for `POST /api/v1/ranges/{rangeSlug}/records`.
 * Maps properties from the `Record` entity, expecting camelCase in the API.
 */
export type CreateRecordCommand = {
    eventDate: Record['event_date'];
    startTime: Record['start_time'];
    endTime: Record['end_time'];
    numParticipants: Record['num_participants'];
};