import { describe, expect, it, vi } from 'vitest';
import { ForbiddenError, RangeNotFoundError, Result } from '@strzel-sobie/common';
import { UpdateRange } from '../../../src/worker/src/endpoints/v1/ranges/update-range';
import { createWorkerTestClient } from '../utils/app';
import { mockConsoleError } from '../utils/console';

mockConsoleError();

const adminUser = {
  id: 9,
  email: 'admin@example.com',
  isDeleted: 0,
  createdAt: '2024-03-03T10:00:00.000Z',
  roles: [{ id: 1, name: 'Administrator', scope: 'global' }],
  rangeRoles: {},
};

describe('PATCH /api/v1/ranges/:rangeSlug', () => {
  it('updates range details through the ranges service', async () => {
    const rangesService = {
      updateRangeDetails: vi.fn().mockResolvedValue(Result.ok(undefined)),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.patch('/api/v1/ranges/:rangeSlug', UpdateRange);
      },
      dependencies: { rangesService, user: adminUser },
    });

    const response = await client.patch('/api/v1/ranges/forest-hills', {
      json: {
        totalTracks: 12,
        operatingHours: { monday: { open: '08:00', close: '18:00' } },
      },
    });

    expect(rangesService.updateRangeDetails).toHaveBeenCalledWith(
      'forest-hills',
      {
        totalTracks: 12,
        operatingHours: { monday: { open: '08:00', close: '18:00' } },
      },
      adminUser,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
  });

  it('returns 404 when the range is missing', async () => {
    const rangesService = {
      updateRangeDetails: vi.fn().mockResolvedValue(Result.fail(new RangeNotFoundError('Not found'))),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.patch('/api/v1/ranges/:rangeSlug', UpdateRange);
      },
      dependencies: { rangesService, user: adminUser },
    });

    const response = await client.patch('/api/v1/ranges/unknown', {
      json: { totalTracks: 4 },
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Not found' });
  });

  it('returns 403 when the user lacks permission', async () => {
    const rangesService = {
      updateRangeDetails: vi.fn().mockResolvedValue(Result.fail(new ForbiddenError('Forbidden'))),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.patch('/api/v1/ranges/:rangeSlug', UpdateRange);
      },
      dependencies: { rangesService, user: adminUser },
    });

    const response = await client.patch('/api/v1/ranges/forest-hills', {
      json: { totalTracks: 4 },
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Forbidden' });
  });
});
