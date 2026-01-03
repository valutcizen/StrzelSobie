import { describe, expect, it, vi } from 'vitest';
import {
  EventAudience,
  EventCapacityType,
  EventNotFoundError,
  EventRegistrationType,
  EventStatus,
  Result,
} from '@strzel-sobie/common/models';
import { GetEvent } from '../../../src/worker/src/endpoints/v1/ranges/get-event';
import { createWorkerTestClient } from '../utils/app';
import { mockConsoleError } from '../utils/console';

mockConsoleError();

const member = {
  id: 7,
  email: 'member@example.com',
  isDeleted: 0,
  createdAt: '2024-05-10T10:00:00.000Z',
  roles: [{ id: 1, name: 'Member', scope: 'global' }],
  rangeRoles: {},
};

describe('GET /api/v1/ranges/:rangeSlug/events/:eventSlug', () => {
  it('returns event details', async () => {
    const eventsService = {
      getEventDetails: vi.fn().mockResolvedValue(
        Result.ok({
          id: 12,
          slug: 'open-day',
          rangeId: 2,
          createdBy: 4,
          name: 'Open Day',
          publicDescription: 'Public',
          memberDescription: null,
          eventDate: '2024-07-10',
          startTime: '10:00',
          endTime: '12:00',
          registrationType: EventRegistrationType.Notice,
          audience: EventAudience.Public,
          capacityType: EventCapacityType.Unlimited,
          capacityLimit: null,
          guestPolicy: null,
          waitlistLimit: null,
          registrationDeadline: null,
          status: EventStatus.Active,
          createdAt: '2024-05-10T10:00:00.000Z',
          updatedAt: null,
        })
      ),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.get('/api/v1/ranges/:rangeSlug/events/:eventSlug', GetEvent);
      },
      dependencies: { eventsService, user: member },
    });

    const response = await client.get('/api/v1/ranges/alpha/events/open-day');

    expect(eventsService.getEventDetails).toHaveBeenCalledWith('alpha', 'open-day', member);
    expect(response.status).toBe(200);
  });

  it('maps missing events to 404', async () => {
    const eventsService = {
      getEventDetails: vi.fn().mockResolvedValue(Result.fail(new EventNotFoundError('Missing'))),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.get('/api/v1/ranges/:rangeSlug/events/:eventSlug', GetEvent);
      },
      dependencies: { eventsService, user: member },
    });

    const response = await client.get('/api/v1/ranges/alpha/events/missing');

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      code: 'event_not_found',
      message: 'Missing',
    });
  });
});
