import {
  EventNotFoundError,
  EventSignupAlreadyExistsError,
  EventSignupCapacityError,
  EventSignupClosedError,
  EventSignupNotAllowedError,
  EventSignupNotFoundError,
  EventValidationError,
  ForbiddenError,
  RangeNotFoundError,
} from '@strzel-sobie/common';

type ErrorResponse = {
  status: number;
  body: {
    code: string;
    message: string;
  };
};

export const mapEventsError = (error: Error): ErrorResponse => {
  if (error instanceof RangeNotFoundError) {
    return {
      status: 404,
      body: { code: 'range_not_found', message: error.message },
    };
  }

  if (error instanceof EventNotFoundError) {
    return {
      status: 404,
      body: { code: 'event_not_found', message: error.message },
    };
  }

  if (error instanceof EventSignupNotFoundError) {
    return {
      status: 404,
      body: { code: 'event_signup_not_found', message: error.message },
    };
  }

  if (error instanceof EventSignupAlreadyExistsError) {
    return {
      status: 409,
      body: { code: 'event_signup_exists', message: error.message },
    };
  }

  if (error instanceof EventSignupCapacityError) {
    return {
      status: 400,
      body: { code: 'event_capacity_full', message: error.message },
    };
  }

  if (error instanceof EventSignupClosedError) {
    return {
      status: 400,
      body: { code: 'event_signup_closed', message: error.message },
    };
  }

  if (error instanceof EventSignupNotAllowedError) {
    return {
      status: 403,
      body: { code: 'event_signup_not_allowed', message: error.message },
    };
  }

  if (error instanceof EventValidationError) {
    return {
      status: 400,
      body: { code: 'event_validation_failed', message: error.message },
    };
  }

  if (error instanceof ForbiddenError) {
    return {
      status: 403,
      body: { code: 'forbidden', message: error.message },
    };
  }

  return {
    status: 500,
    body: { code: 'internal_error', message: 'Unexpected error occurred' },
  };
};
