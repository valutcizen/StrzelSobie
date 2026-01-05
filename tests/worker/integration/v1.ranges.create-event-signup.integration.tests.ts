import { describe, expect, it, vi } from 'vitest';
import { EventSignupAlreadyExistsError, Result } from '@strzel-sobie/common/models';
import { CreateEventSignup } from '../../../src/worker/src/endpoints/v1/ranges/create-event-signup';
import { createWorkerTestClient } from '../utils/app';
import { mockConsoleError } from '../utils/console';

mockConsoleError();

const member = {
  id: 5,
  email: 'member@example.com',
  isDeleted: 0,
  createdAt: '2024-05-10T10:00:00.000Z',
  roles: [{ id: 1, name: 'Member', scope: 'global' }],
  rangeRoles: {},
};

describe('POST /api/v1/ranges/:rangeSlug/events/:eventSlug/signups', () => {
  it('creates an event signup', async () => {
    const eventsService = {
      createSignup: vi.fn().mockResolvedValue(Result.ok({ signupId: 99, status: 'confirmed' })),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.post('/api/v1/ranges/:rangeSlug/events/:eventSlug/signups', CreateEventSignup);
      },
      dependencies: { eventsService, user: member },
    });

    const response = await client.post('/api/v1/ranges/alpha/events/open-day/signups', {
      json: { guests: 1 },
    });

    expect(eventsService.createSignup).toHaveBeenCalledWith(
      'alpha',
      'open-day',
      { guests: 1 },
      member
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ signupId: 99, status: 'confirmed' });
  });

  it('maps existing signups to 409', async () => {
    const eventsService = {
      createSignup: vi
        .fn()
        .mockResolvedValue(Result.fail(new EventSignupAlreadyExistsError('Already'))),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.post('/api/v1/ranges/:rangeSlug/events/:eventSlug/signups', CreateEventSignup);
      },
      dependencies: { eventsService, user: member },
    });

    const response = await client.post('/api/v1/ranges/alpha/events/open-day/signups', {
      json: { guests: 0 },
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      code: 'event_signup_exists',
      message: 'Already',
    });
  });
});
