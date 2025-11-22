import {
  ForbiddenError,
  InvalidPropositionTimeError,
  InvalidReservationTimeError,
  RangeClosedError,
  PropositionAlreadyClosedError,
  PropositionConflictError,
  PropositionNotFoundError,
  RangeNotFoundError,
  ReservationConflictError,
  ReservationCreationError,
  ReservationConflictItem,
  UnauthorizedPropositionError,
  ReservationNotFoundError,
  ReservationCancellationError,
  InvalidRecordTimeError,
  RecordCreationError,
  RangeBookingNotAllowedError,
} from '@strzel-sobie/common';

type ErrorResponse = {
  status: number;
  body: {
    code: string;
    message: string;
    conflicts?: ReservationConflictItem[];
    forceRequired?: boolean;
  };
};

export const mapReservationsError = (error: Error): ErrorResponse => {
  if (error instanceof RangeNotFoundError) {
    return {
      status: 404,
      body: { code: 'range_not_found', message: error.message },
    };
  }

  if (error instanceof UnauthorizedPropositionError || error instanceof ForbiddenError) {
    return {
      status: 403,
      body: { code: 'forbidden', message: error.message },
    };
  }

  if (error instanceof InvalidPropositionTimeError) {
    return {
      status: 400,
      body: { code: 'invalid_time_window', message: error.message },
    };
  }

  if (error instanceof InvalidReservationTimeError) {
    return {
      status: 400,
      body: { code: 'invalid_reservation_time', message: error.message },
    };
  }

  if (error instanceof RangeClosedError) {
    return {
      status: 400,
      body: { code: 'range_closed', message: error.message },
    };
  }

  if (error instanceof RangeBookingNotAllowedError) {
    return {
      status: 409,
      body: { code: 'reservations_not_available_for_ally_range', message: error.message },
    };
  }

  if (error instanceof InvalidRecordTimeError) {
    return {
      status: 400,
      body: { code: 'invalid_record_time', message: error.message },
    };
  }

  if (error instanceof PropositionConflictError) {
    return {
      status: 400,
      body: { code: 'schedule_conflict', message: error.message },
    };
  }

  if (error instanceof ReservationConflictError) {
    const { conflicts, requiresForce } = error.details;
    return {
      status: 400,
      body: {
        code: requiresForce ? 'reservation_force_required' : 'reservation_conflict',
        message: error.message,
        conflicts,
        forceRequired: requiresForce,
      },
    };
  }

  if (error instanceof PropositionAlreadyClosedError) {
    return {
      status: 400,
      body: { code: 'proposition_closed', message: error.message },
    };
  }

  if (error instanceof PropositionNotFoundError) {
    return {
      status: 404,
      body: { code: 'proposition_not_found', message: error.message },
    };
  }

  if (error instanceof ReservationCreationError) {
    return {
      status: 500,
      body: { code: 'reservation_creation_failed', message: error.message },
    };
  }

  if (error instanceof RecordCreationError) {
    return {
      status: 500,
      body: { code: 'record_creation_failed', message: error.message },
    };
  }

  if (error instanceof ReservationNotFoundError) {
    return {
      status: 404,
      body: { code: 'reservation_not_found', message: error.message },
    };
  }

  if (error instanceof ReservationCancellationError) {
    return {
      status: 500,
      body: { code: 'reservation_cancellation_failed', message: error.message },
    };
  }

  return {
    status: 500,
    body: { code: 'internal_error', message: 'Unexpected error occurred' },
  };
};
