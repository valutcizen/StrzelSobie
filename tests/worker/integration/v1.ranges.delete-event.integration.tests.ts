import { describe, expect, it, vi } from 'vitest';
import { EventNotFoundError, Result } from '@strzel-sobie/common/models';
import { DeleteEvent } from '../../../src/worker/src/endpoints/v1/ranges/delete-event';
import { createWorkerTestClient } from '../utils/app';
import { mockConsoleError } from '../utils/console';

mockConsoleError();

const admin = {
  id: 9,
  email: 'admin@example.com',
  isDeleted: 0,
  createdAt: '2024-05-10T10:00:00.000Z',
  roles: [{ id: 1, name: 'Club/Community Administrator', scope: 'global' }],
  rangeRoles: {},
};

describe('DELETE /api/v1/ranges/:rangeSlug/events/:eventSlug', () => {
  it('cancels an event', async () => {
    const eventsService = {
      cancelEvent: vi.fn().mockResolvedValue(Result.ok(undefined)),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.delete('/api/v1/ranges/:rangeSlug/events/:eventSlug', DeleteEvent);
      },
      dependencies: { eventsService, user: admin },
    });

    const response = await client.delete('/api/v1/ranges/alpha/events/open-day');

    expect(eventsService.cancelEvent).toHaveBeenCalledWith('alpha', 'open-day', admin);
    expect(response.status).toBe(204);
  });

  it('maps missing events to 404', async () => {
    const eventsService = {
      cancelEvent: vi.fn().mockResolvedValue(Result.fail(new EventNotFoundError('Missing'))),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.delete('/api/v1/ranges/:rangeSlug/events/:eventSlug', DeleteEvent);
      },
      dependencies: { eventsService, user: admin },
    });

    const response = await client.delete('/api/v1/ranges/alpha/events/missing');

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      code: 'event_not_found',
      message: 'Missing',
    });
  });
});
