import { describe, expect, it, vi } from 'vitest';
import {
  EventAudience,
  EventCapacityType,
  EventRegistrationType,
  EventStatus,
  EventValidationError,
  Result,
} from '@strzel-sobie/common/models';
import { UpdateEvent } from '../../../src/worker/src/endpoints/v1/ranges/update-event';
import { createWorkerTestClient } from '../utils/app';
import { mockConsoleError } from '../utils/console';

mockConsoleError();

const admin = {
  id: 22,
  email: 'admin@example.com',
  isDeleted: 0,
  createdAt: '2024-05-10T10:00:00.000Z',
  roles: [{ id: 1, name: 'Club/Community Administrator', scope: 'global' }],
  rangeRoles: {},
};

describe('PATCH /api/v1/ranges/:rangeSlug/events/:eventSlug', () => {
  it('updates an event', async () => {
    const eventsService = {
      updateEvent: vi.fn().mockResolvedValue(
        Result.ok({
          id: 12,
          slug: 'open-day',
          rangeId: 2,
          createdBy: 4,
          name: 'Updated',
          publicDescription: 'Public',
          memberDescription: null,
          eventDate: '2024-07-10',
          startTime: '11:00',
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
          updatedAt: '2024-05-11T10:00:00.000Z',
        })
      ),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.patch('/api/v1/ranges/:rangeSlug/events/:eventSlug', UpdateEvent);
      },
      dependencies: { eventsService, user: admin },
    });

    const response = await client.patch('/api/v1/ranges/alpha/events/open-day', {
      json: {
        name: 'Updated',
        startTime: '11:00',
        endTime: '12:00',
      },
    });

    expect(eventsService.updateEvent).toHaveBeenCalledWith(
      'alpha',
      'open-day',
      {
        name: 'Updated',
        startTime: '11:00',
        endTime: '12:00',
      },
      admin
    );
    expect(response.status).toBe(200);
  });

  it('maps validation errors to 400', async () => {
    const eventsService = {
      updateEvent: vi.fn().mockResolvedValue(Result.fail(new EventValidationError('Invalid'))),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.patch('/api/v1/ranges/:rangeSlug/events/:eventSlug', UpdateEvent);
      },
      dependencies: { eventsService, user: admin },
    });

    const response = await client.patch('/api/v1/ranges/alpha/events/open-day', {
      json: {
        name: 'Updated',
        startTime: '12:00',
        endTime: '13:00',
      },
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      code: 'event_validation_failed',
      message: 'Invalid',
    });
  });
});
