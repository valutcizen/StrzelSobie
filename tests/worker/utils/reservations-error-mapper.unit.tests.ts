import { describe, expect, it } from 'vitest';
import { mapReservationsError } from '../../../src/worker/src/utils/reservations-error-mapper';
import {
  ForbiddenError,
  InvalidPropositionTimeError,
  InvalidRecordTimeError,
  InvalidReservationTimeError,
  PropositionAlreadyClosedError,
  PropositionConflictError,
  PropositionNotFoundError,
  RangeBookingNotAllowedError,
  RangeClosedError,
  RangeNotFoundError,
  RecordCreationError,
  ReservationCancellationError,
  ReservationConflictError,
  ReservationCreationError,
  ReservationNotFoundError,
  UnauthorizedPropositionError,
} from '@strzel-sobie/common';

describe('mapReservationsError', () => {
  const cases: { name: string; error: Error; expected: { status: number; code: string; message: string } }[] =
    [
      { name: 'range not found', error: new RangeNotFoundError('missing'), expected: { status: 404, code: 'range_not_found', message: 'missing' } },
      { name: 'unauthorized proposition', error: new UnauthorizedPropositionError('nope'), expected: { status: 403, code: 'forbidden', message: 'nope' } },
      { name: 'forbidden', error: new ForbiddenError('blocked'), expected: { status: 403, code: 'forbidden', message: 'blocked' } },
      { name: 'invalid proposition time', error: new InvalidPropositionTimeError('bad time'), expected: { status: 400, code: 'invalid_time_window', message: 'bad time' } },
      { name: 'invalid reservation time', error: new InvalidReservationTimeError('bad reservation time'), expected: { status: 400, code: 'invalid_reservation_time', message: 'bad reservation time' } },
      { name: 'range closed', error: new RangeClosedError('closed'), expected: { status: 400, code: 'range_closed', message: 'closed' } },
      { name: 'ally range reservations blocked', error: new RangeBookingNotAllowedError('ally'), expected: { status: 409, code: 'reservations_not_available_for_ally_range', message: 'ally' } },
      { name: 'invalid record time', error: new InvalidRecordTimeError('record time'), expected: { status: 400, code: 'invalid_record_time', message: 'record time' } },
      { name: 'proposition conflict', error: new PropositionConflictError('conflict'), expected: { status: 400, code: 'schedule_conflict', message: 'conflict' } },
      { name: 'proposition closed', error: new PropositionAlreadyClosedError('closed'), expected: { status: 400, code: 'proposition_closed', message: 'closed' } },
      { name: 'proposition not found', error: new PropositionNotFoundError('missing proposition'), expected: { status: 404, code: 'proposition_not_found', message: 'missing proposition' } },
      { name: 'reservation creation failed', error: new ReservationCreationError('create fail'), expected: { status: 500, code: 'reservation_creation_failed', message: 'create fail' } },
      { name: 'record creation failed', error: new RecordCreationError('record fail'), expected: { status: 500, code: 'record_creation_failed', message: 'record fail' } },
      { name: 'reservation not found', error: new ReservationNotFoundError('missing reservation'), expected: { status: 404, code: 'reservation_not_found', message: 'missing reservation' } },
      { name: 'reservation cancellation failed', error: new ReservationCancellationError('cancel fail'), expected: { status: 500, code: 'reservation_cancellation_failed', message: 'cancel fail' } },
    ];

  cases.forEach(({ name, error, expected }) => {
    it(`maps ${name}`, () => {
      const response = mapReservationsError(error);

      expect(response.status).toBe(expected.status);
      expect(response.body.code).toBe(expected.code);
      expect(response.body.message).toBe(expected.message);
    });
  });

  it('maps reservation conflicts with conflicts and force flag when required', () => {
    const conflictError = new ReservationConflictError({
      conflicts: [{ reservationId: 1, startTime: '09:00', endTime: '10:00' }],
      requiresForce: true,
    }, 'conflicts found');

    const response = mapReservationsError(conflictError);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'reservation_force_required',
      message: 'conflicts found',
      conflicts: [{ reservationId: 1, startTime: '09:00', endTime: '10:00' }],
      forceRequired: true,
    });
  });

  it('maps reservation conflicts without force requirement', () => {
    const conflictError = new ReservationConflictError({
      conflicts: [{ reservationId: 2, startTime: '11:00', endTime: '12:00' }],
      requiresForce: false,
    }, 'simple conflict');

    const response = mapReservationsError(conflictError);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'reservation_conflict',
      message: 'simple conflict',
      conflicts: [{ reservationId: 2, startTime: '11:00', endTime: '12:00' }],
      forceRequired: false,
    });
  });

  it('defaults to internal error for unexpected exceptions', () => {
    const response = mapReservationsError(new Error('unknown'));

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      code: 'internal_error',
      message: 'Unexpected error occurred',
    });
  });
});
