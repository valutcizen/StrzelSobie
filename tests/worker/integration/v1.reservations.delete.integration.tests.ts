import { describe, expect, it, vi } from 'vitest';
import {
  ReservationCancellationError,
  ReservationNotFoundError,
  Result,
} from '@strzel-sobie/common';
import { DeleteReservation } from '../../../src/worker/src/endpoints/v1/reservations/delete-reservation';
import { createWorkerTestClient } from '../utils/app';
import { mockConsoleError } from '../utils/console';

mockConsoleError();

const coordinator = {
  id: 31,
  email: 'coordinator@example.com',
  isDeleted: 0,
  createdAt: '2024-01-15T08:00:00.000Z',
  roles: [{ id: 5, name: 'Coordinator', scope: 'global' }],
  rangeRoles: {},
};

describe('DELETE /api/v1/reservations/:reservationId', () => {
  it('invokes the reservations service to cancel a reservation', async () => {
    const reservationsService = {
      cancelReservation: vi.fn().mockResolvedValue(Result.ok(undefined)),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.delete('/api/v1/reservations/:reservationId', DeleteReservation);
      },
      dependencies: { reservationsService, user: coordinator },
    });

    const response = await client.delete('/api/v1/reservations/72');

    expect(reservationsService.cancelReservation).toHaveBeenCalledWith(
      { reservationId: 72 },
      coordinator,
    );
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });

  it.each([
    [new ReservationNotFoundError('Missing'), 404, { code: 'reservation_not_found', message: 'Missing' }],
    [
      new ReservationCancellationError('Failed to cancel'),
      500,
      { code: 'reservation_cancellation_failed', message: 'Failed to cancel' },
    ],
  ])('propagates %s from the service layer', async (error, status, body) => {
    const reservationsService = {
      cancelReservation: vi.fn().mockResolvedValue(Result.fail(error)),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.delete('/api/v1/reservations/:reservationId', DeleteReservation);
      },
      dependencies: { reservationsService, user: coordinator },
    });

    const response = await client.delete('/api/v1/reservations/72');

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual(body);
  });
});
