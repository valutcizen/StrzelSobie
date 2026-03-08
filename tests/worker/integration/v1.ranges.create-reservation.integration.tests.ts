import { describe, expect, it, vi } from 'vitest';
import {
  Result,
  InvalidTimeRangeError,
  NoAvailableSpotsError,
  ReservationInPastError,
  UserDoesNotHavePermissionError,
  CreateReservationCommand,
  CreatedReservationDto,
  ReservationConflictError,
} from '@strzel-sobie/common/models';
import { CreateReservation } from '../../../src/worker/src/endpoints/v1/ranges/create-reservation';
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

describe('POST /api/v1/ranges/:rangeSlug/reservations', () => {
  it('creates a direct reservation and passes the force flag', async () => {
    const reservation: CreatedReservationDto = {
      id: 101,
      range_id: 7,
      approved_by_admin_id: 31,
    };

    const reservationsService = {
      createReservation: vi.fn().mockResolvedValue(Result.ok(reservation)),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.post('/api/v1/ranges/:rangeSlug/reservations', CreateReservation);
      },
      dependencies: { reservationsService, user: coordinator },
    });

    const response = await client.post('/api/v1/ranges/forest-hills/reservations?force=true', {
      json: {
        eventDate: '2024-05-20',
        startTime: '09:00',
        endTime: '11:00',
        firingLineId: 101,
        trackNos: [1, 2, 3],
      },
    });

    expect(reservationsService.createReservation).toHaveBeenCalledWith(
      'forest-hills',
      {
        eventDate: '2024-05-20',
        startTime: '09:00',
        endTime: '11:00',
        firingLineId: 101,
        trackNos: [1, 2, 3],
      },
      { force: true },
      coordinator,
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(reservation);
    expect(response.headers.get('location')).toBe('/api/v1/ranges/forest-hills/reservations/101');
  });

  it('creates a reservation from a proposition when provided', async () => {
    const reservation: CreatedReservationDto = {
      id: 102,
      range_id: 7,
      approved_by_admin_id: 31,
    };

    const reservationsService = {
      createReservation: vi.fn().mockResolvedValue(Result.ok(reservation)),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.post('/api/v1/ranges/:rangeSlug/reservations', CreateReservation);
      },
      dependencies: { reservationsService, user: coordinator },
    });

    const response = await client.post('/api/v1/ranges/forest-hills/reservations', {
      json: {
        propositionId: 55,
        startTime: '12:00',
        endTime: '13:00',
        adminMessage: 'Approved. See you on range.',
      },
    });

    expect(reservationsService.createReservation).toHaveBeenCalledWith(
      'forest-hills',
      {
        propositionId: 55,
        startTime: '12:00',
        endTime: '13:00',
        adminMessage: 'Approved. See you on range.',
      },
      { force: false },
      coordinator,
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(reservation);
  });

  it('returns conflict information when reservation creation fails due to overlaps', async () => {
    const conflicts: ReservationConflictItem[] = [
      {
        id: 77,
        type: 'reservation',
        eventDate: '2024-05-20',
        startTime: '09:00',
        endTime: '10:00',
        firingLineId: 101,
        trackNos: [1, 2],
      },
    ];

    const reservationsService = {
      createReservation: vi
        .fn()
        .mockResolvedValue(Result.fail(new ReservationConflictError({ conflicts, requiresForce: true }))),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.post('/api/v1/ranges/:rangeSlug/reservations', CreateReservation);
      },
      dependencies: { reservationsService, user: coordinator },
    });

    const response = await client.post('/api/v1/ranges/forest-hills/reservations', {
      json: {
        eventDate: '2024-05-20',
        startTime: '09:00',
        endTime: '11:00',
        firingLineId: 101,
        trackNos: [1, 2, 3],
      },
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      code: 'reservation_force_required',
      message: 'Reservation conflicts with existing usage',
      conflicts,
      forceRequired: true,
    });
  });
});
