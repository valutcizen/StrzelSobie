import {
  ForbiddenError,
  InvalidPropositionTimeError,
  PropositionAlreadyClosedError,
  PropositionConflictError,
  PropositionNotFoundError,
  RangeNotFoundError,
  UnauthorizedPropositionError,
} from '@strzel-sobie/common';

type ErrorResponse = {
  status: number;
  body: {
    code: string;
    message: string;
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

  if (error instanceof PropositionConflictError) {
    return {
      status: 400,
      body: { code: 'schedule_conflict', message: error.message },
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

  return {
    status: 500,
    body: { code: 'internal_error', message: 'Unexpected error occurred' },
  };
};
