import { describe, expect, it, vi } from 'vitest';
import {
  Result,
  InvalidTimeRangeError,
  UserDoesNotHavePermissionError,
  CreatePropositionCommand,
  CreatedPropositionDto,
  UnauthorizedPropositionError,
} from '@strzel-sobie/common/models';
import { CreateProposition } from '../../../src/worker/src/endpoints/v1/ranges/create-proposition';
import { createWorkerTestClient } from '../utils/app';
import { mockConsoleError } from '../utils/console';

mockConsoleError();

const memberUser = {
  id: 18,
  email: 'member@example.com',
  isDeleted: 0,
  createdAt: '2024-02-01T09:00:00.000Z',
  roles: [{ id: 3, name: 'Member', scope: 'global' }],
  rangeRoles: {},
};

describe('POST /api/v1/ranges/:rangeSlug/propositions', () => {
  it('creates a proposition through the reservations service and returns 201', async () => {
    const proposition: CreatedPropositionDto = {
      id: 44,
      user_id: 18,
      range_id: 7,
      status: 'pending',
    };
    const reservationsService = {
      createProposition: vi.fn().mockResolvedValue(Result.ok(proposition)),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.post('/api/v1/ranges/:rangeSlug/propositions', CreateProposition);
      },
      dependencies: { reservationsService, user: memberUser },
    });

    const response = await client.post('/api/v1/ranges/forest-hills/propositions', {
      json: {
        eventDate: '2024-05-01',
        startTime: '10:00',
        endTime: '11:30',
        firingLineId: 101,
        trackNos: [1, 2],
        hasCoordinatorLicenseInGroup: true,
      },
    });

    expect(reservationsService.createProposition).toHaveBeenCalledWith(
      'forest-hills',
      {
        eventDate: '2024-05-01',
        startTime: '10:00',
        endTime: '11:30',
        firingLineId: 101,
        trackNos: [1, 2],
        hasCoordinatorLicenseInGroup: true,
      },
      memberUser,
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(proposition);
    expect(response.headers.get('location')).toBe('/api/v1/ranges/forest-hills/propositions/44');
  });

  it('returns 403 when the service denies proposition creation', async () => {
    const reservationsService = {
      createProposition: vi
        .fn()
        .mockResolvedValue(Result.fail(new UnauthorizedPropositionError('No access'))),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.post('/api/v1/ranges/:rangeSlug/propositions', CreateProposition);
      },
      dependencies: { reservationsService, user: memberUser },
    });

    const response = await client.post('/api/v1/ranges/forest-hills/propositions', {
      json: {
        eventDate: '2024-05-01',
        startTime: '10:00',
        endTime: '11:30',
        firingLineId: 101,
        trackNos: [1, 2],
        hasCoordinatorLicenseInGroup: true,
      },
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: 'forbidden',
      message: 'No access',
    });
  });
});
