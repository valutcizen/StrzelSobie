export class UserNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserNotFoundError';
  }
}

export class RoleNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoleNotFoundError';
  }
}

export class RoleScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoleScopeError';
  }
}

export class RangeNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RangeNotFoundError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class EmailAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`User with email ${email} already exists`);
    this.name = 'EmailAlreadyExistsError';
  }

  static [Symbol.hasInstance](instance: unknown): boolean {
    return instance instanceof Error && instance.name === 'EmailAlreadyExistsError';
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}

export class PropositionConflictError extends Error {
  constructor(message = 'Requested time slot conflicts with existing usage') {
    super(message);
    this.name = 'PropositionConflictError';
  }
}

export class InvalidPropositionTimeError extends Error {
  constructor(message = 'Proposition time window is invalid') {
    super(message);
    this.name = 'InvalidPropositionTimeError';
  }
}

export class UnauthorizedPropositionError extends Error {
  constructor(message = 'User is not allowed to create propositions for this range') {
    super(message);
    this.name = 'UnauthorizedPropositionError';
  }
}

export class PropositionNotFoundError extends Error {
  constructor(message = 'Proposition not found') {
    super(message);
    this.name = 'PropositionNotFoundError';
  }
}

export class PropositionAlreadyClosedError extends Error {
  constructor(message = 'Proposition is no longer open') {
    super(message);
    this.name = 'PropositionAlreadyClosedError';
  }
}

export class InvalidReservationTimeError extends Error {
  constructor(message = 'Reservation time window is invalid') {
    super(message);
    this.name = 'InvalidReservationTimeError';
  }
}

export class InvalidRecordTimeError extends Error {
  constructor(message = 'Record time window is invalid') {
    super(message);
    this.name = 'InvalidRecordTimeError';
  }
}

export type ReservationConflictItem = {
  id: number;
  type: 'reservation' | 'proposition';
  eventDate: string;
  startTime: string;
  endTime: string;
  tracksRequested: number;
};

export type ReservationConflictDetails = {
  conflicts: ReservationConflictItem[];
  requiresForce: boolean;
};

export class ReservationConflictError extends Error {
  constructor(
    public readonly details: ReservationConflictDetails,
    message = 'Reservation conflicts with existing usage'
  ) {
    super(message);
    this.name = 'ReservationConflictError';
  }
}

export class ReservationCreationError extends Error {
  constructor(message = 'Failed to create reservation') {
    super(message);
    this.name = 'ReservationCreationError';
  }
}

export class RecordCreationError extends Error {
  constructor(message = 'Failed to create record') {
    super(message);
    this.name = 'RecordCreationError';
  }
}

export class ReservationNotFoundError extends Error {
  constructor(message = 'Reservation not found') {
    super(message);
    this.name = 'ReservationNotFoundError';
  }
}

export class ReservationCancellationError extends Error {
  constructor(message = 'Failed to cancel reservation') {
    super(message);
    this.name = 'ReservationCancellationError';
  }
}

export class RangeClosedError extends Error {
  constructor(message = 'Range is closed for the selected time window') {
    super(message);
    this.name = 'RangeClosedError';
  }
}

export class RangeBookingNotAllowedError extends Error {
  constructor(message = 'Reservations are not available for this range') {
    super(message);
    this.name = 'RangeBookingNotAllowedError';
  }
}
