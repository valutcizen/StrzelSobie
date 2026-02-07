import { describe, expect, it, vi } from 'vitest';
import {
  EventAudience,
  EventCapacityType,
  EventRegistrationType,
  EventStatus,
  EventValidationError,
  ForbiddenError,
  Result,
} from '@strzel-sobie/common/models';
import { CreateEvent } from '../../../src/worker/src/endpoints/v1/ranges/create-event';
import { createWorkerTestClient } from '../utils/app';
import { mockConsoleError } from '../utils/console';

mockConsoleError();

const admin = {
  id: 12,
  email: 'admin@example.com',
  isDeleted: 0,
  createdAt: '2024-05-10T10:00:00.000Z',
  roles: [{ id: 1, name: 'Club/Community Administrator', scope: 'global' }],
  rangeRoles: {},
};

describe('POST /api/v1/ranges/:rangeSlug/events', () => {
  it('creates a new event', async () => {
    const eventsService = {
      createEvent: vi.fn().mockResolvedValue(
        Result.ok({
          id: 55,
          slug: 'open-day',
          rangeId: 4,
          createdBy: admin.id,
          name: 'Open Day',
          publicDescription: 'Welcome!',
          memberDescription: null,
          eventDate: '2024-07-10',
          startTime: '10:00',
          endTime: '12:00',
          registrationType: EventRegistrationType.RegistrationRequired,
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
        router.post('/api/v1/ranges/:rangeSlug/events', CreateEvent);
      },
      dependencies: { eventsService, user: admin },
    });

    const response = await client.post('/api/v1/ranges/alpha/events', {
      json: {
        name: 'Open Day',
        publicDescription: 'Welcome!',
        memberDescription: null,
        eventDate: '2024-07-10',
        startTime: '10:00',
        endTime: '12:00',
        registrationType: EventRegistrationType.RegistrationRequired,
        audience: EventAudience.Public,
        capacityType: EventCapacityType.Unlimited,
      },
    });

    expect(eventsService.createEvent).toHaveBeenCalledWith(
      'alpha',
      expect.objectContaining({
        name: 'Open Day',
        publicDescription: 'Welcome!',
        eventDate: '2024-07-10',
      }),
      admin
    );
    expect(response.status).toBe(201);
  });

  it('maps validation errors to 400 responses', async () => {
    const eventsService = {
      createEvent: vi.fn().mockResolvedValue(Result.fail(new EventValidationError('Invalid'))),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.post('/api/v1/ranges/:rangeSlug/events', CreateEvent);
      },
      dependencies: { eventsService, user: admin },
    });

    const response = await client.post('/api/v1/ranges/alpha/events', {
      json: {
        name: 'Bad Event',
        publicDescription: 'Invalid',
        eventDate: '2024-07-10',
        startTime: '10:00',
        endTime: '11:00',
        registrationType: EventRegistrationType.Notice,
        audience: EventAudience.Public,
        capacityType: EventCapacityType.Unlimited,
      },
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      code: 'event_validation_failed',
      message: 'Invalid',
    });
  });

  it('maps forbidden errors to 403 responses', async () => {
    const eventsService = {
      createEvent: vi.fn().mockResolvedValue(Result.fail(new ForbiddenError('No access'))),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.post('/api/v1/ranges/:rangeSlug/events', CreateEvent);
      },
      dependencies: { eventsService, user: admin },
    });

    const response = await client.post('/api/v1/ranges/alpha/events', {
      json: {
        name: 'Open Day',
        publicDescription: 'Welcome!',
        eventDate: '2024-07-10',
        startTime: '10:00',
        endTime: '12:00',
        registrationType: EventRegistrationType.Notice,
        audience: EventAudience.Public,
        capacityType: EventCapacityType.Unlimited,
      },
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: 'forbidden',
      message: 'No access',
    });
  });
});
