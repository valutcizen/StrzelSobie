import { describe, expect, it, vi } from 'vitest';
import { EventSignupNotFoundError, Result } from '@strzel-sobie/common/models';
import { UpdateEventSignup } from '../../../src/worker/src/endpoints/v1/ranges/update-event-signup';
import { createWorkerTestClient } from '../utils/app';
import { mockConsoleError } from '../utils/console';

mockConsoleError();

const member = {
  id: 6,
  email: 'member@example.com',
  isDeleted: 0,
  createdAt: '2024-05-10T10:00:00.000Z',
  roles: [{ id: 1, name: 'Member', scope: 'global' }],
  rangeRoles: {},
};

describe('PATCH /api/v1/ranges/:rangeSlug/events/:eventSlug/signups/me', () => {
  it('updates an event signup', async () => {
    const eventsService = {
      updateSignup: vi.fn().mockResolvedValue(Result.ok({ signupId: 77, status: 'confirmed' })),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.patch('/api/v1/ranges/:rangeSlug/events/:eventSlug/signups/me', UpdateEventSignup);
      },
      dependencies: { eventsService, user: member },
    });

    const response = await client.patch('/api/v1/ranges/alpha/events/open-day/signups/me', {
      json: { guests: 2 },
    });

    expect(eventsService.updateSignup).toHaveBeenCalledWith(
      'alpha',
      'open-day',
      { guests: 2 },
      member
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ signupId: 77, status: 'confirmed' });
  });

  it('maps missing signups to 404', async () => {
    const eventsService = {
      updateSignup: vi.fn().mockResolvedValue(Result.fail(new EventSignupNotFoundError('Missing'))),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.patch('/api/v1/ranges/:rangeSlug/events/:eventSlug/signups/me', UpdateEventSignup);
      },
      dependencies: { eventsService, user: member },
    });

    const response = await client.patch('/api/v1/ranges/alpha/events/open-day/signups/me', {
      json: { guests: 1 },
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      code: 'event_signup_not_found',
      message: 'Missing',
    });
  });
});
