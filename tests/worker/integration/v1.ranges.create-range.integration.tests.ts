import { describe, expect, it, vi } from 'vitest';
import { InvalidRangeSlugError, Result } from '@strzel-sobie/common';
import { CreateRange } from '../../../src/worker/src/endpoints/v1/ranges/create-range';
import { createWorkerTestClient } from '../utils/app';
import { mockConsoleError } from '../utils/console';

mockConsoleError();

const adminUser = {
  id: 9,
  email: 'admin@example.com',
  isDeleted: 0,
  createdAt: '2024-03-03T10:00:00.000Z',
  roles: [{ id: 1, name: 'Club/Community Administrator', scope: 'global' }],
  rangeRoles: {},
};

describe('POST /api/v1/ranges', () => {
  it('rejects invalid range slug format during request validation', async () => {
    const rangesService = {
      createRange: vi.fn(),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.post('/api/v1/ranges', CreateRange);
      },
      dependencies: { rangesService, user: adminUser },
    });

    const response = await client.post('/api/v1/ranges', {
      json: { slug: 'A A', displayName: 'Invalid' },
    });

    expect(response.status).toBe(400);
    expect(rangesService.createRange).not.toHaveBeenCalled();
  });

  it('maps InvalidRangeSlugError from service to 400', async () => {
    const rangesService = {
      createRange: vi.fn().mockResolvedValue(Result.fail(new InvalidRangeSlugError('Invalid slug'))),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.post('/api/v1/ranges', CreateRange);
      },
      dependencies: { rangesService, user: adminUser },
    });

    const response = await client.post('/api/v1/ranges', {
      json: { slug: 'valid-slug', displayName: 'Valid' },
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid slug' });
  });
});
