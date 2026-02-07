import { describe, expect, it, vi } from 'vitest';
import { EventSignupNotFoundError, Result } from '@strzel-sobie/common/models';
import { DeleteEventSignup } from '../../../src/worker/src/endpoints/v1/ranges/delete-event-signup';
import { createWorkerTestClient } from '../utils/app';
import { mockConsoleError } from '../utils/console';

mockConsoleError();

const member = {
  id: 8,
  email: 'member@example.com',
  isDeleted: 0,
  createdAt: '2024-05-10T10:00:00.000Z',
  roles: [{ id: 1, name: 'Member', scope: 'global' }],
  rangeRoles: {},
};

describe('DELETE /api/v1/ranges/:rangeSlug/events/:eventSlug/signups/me', () => {
  it('cancels an event signup', async () => {
    const eventsService = {
      cancelSignup: vi.fn().mockResolvedValue(Result.ok(undefined)),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.delete('/api/v1/ranges/:rangeSlug/events/:eventSlug/signups/me', DeleteEventSignup);
      },
      dependencies: { eventsService, user: member },
    });

    const response = await client.delete('/api/v1/ranges/alpha/events/open-day/signups/me');

    expect(eventsService.cancelSignup).toHaveBeenCalledWith('alpha', 'open-day', member);
    expect(response.status).toBe(204);
  });

  it('maps missing signups to 404', async () => {
    const eventsService = {
      cancelSignup: vi.fn().mockResolvedValue(Result.fail(new EventSignupNotFoundError('Missing'))),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.delete('/api/v1/ranges/:rangeSlug/events/:eventSlug/signups/me', DeleteEventSignup);
      },
      dependencies: { eventsService, user: member },
    });

    const response = await client.delete('/api/v1/ranges/alpha/events/open-day/signups/me');

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      code: 'event_signup_not_found',
      message: 'Missing',
    });
  });
});
