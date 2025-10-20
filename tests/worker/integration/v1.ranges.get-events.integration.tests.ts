import { describe, expect, it, vi } from 'vitest';
import { RangeNotFoundError, Result } from '@strzel-sobie/common';
import { GetEvents } from '../../../src/worker/src/endpoints/v1/ranges/get-events';
import { createWorkerTestClient } from '../utils/app';
import { mockConsoleError } from '../utils/console';

mockConsoleError();

const coordinator = {
  id: 15,
  email: 'coordinator@example.com',
  isDeleted: 0,
  createdAt: '2024-02-20T09:00:00.000Z',
  roles: [{ id: 1, name: 'Coordinator', scope: 'global' }],
  rangeRoles: {
    '10': [{ id: 2, name: 'Range Officer', scope: 'range' }],
  },
};

describe('GET /api/v1/ranges/:rangeSlug/events', () => {
  it('requests calendar events from the reservations service with the normalized user payload', async () => {
    const reservationsService = {
      getCalendarEvents: vi.fn().mockResolvedValue(
        Result.ok({
          reservations: [],
          propositions: [],
        }),
      ),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.get('/api/v1/ranges/:rangeSlug/events', GetEvents);
      },
      dependencies: { reservationsService, user: coordinator },
    });

    const response = await client.get(
      '/api/v1/ranges/forest-hills/events?startDate=2024-04-01&endDate=2024-04-07',
    );

    expect(reservationsService.getCalendarEvents).toHaveBeenCalledWith({
      rangeSlug: 'forest-hills',
      startDate: '2024-04-01',
      endDate: '2024-04-07',
      user: {
        id: '15',
        roles: ['Coordinator'],
        range_roles: { '10': ['Range Officer'] },
      },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      reservations: [],
      propositions: [],
    });
  });

  it('maps range lookup failures to 404 responses', async () => {
    const reservationsService = {
      getCalendarEvents: vi.fn().mockResolvedValue(Result.fail(new RangeNotFoundError('Missing'))),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.get('/api/v1/ranges/:rangeSlug/events', GetEvents);
      },
      dependencies: { reservationsService, user: coordinator },
    });

    const response = await client.get(
      '/api/v1/ranges/unknown/events?startDate=2024-04-01&endDate=2024-04-07',
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      code: 'range_not_found',
      message: 'Missing',
    });
  });
});
