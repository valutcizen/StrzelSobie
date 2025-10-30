import { describe, expect, it, vi } from 'vitest';
import { RangeNotFoundError, Result } from '@strzel-sobie/common';
import { GetRange } from '../../../src/worker/src/endpoints/v1/ranges/get-range';
import { createWorkerTestClient } from '../utils/app';
import { mockConsoleError } from '../utils/console';

mockConsoleError();

describe('GET /api/v1/ranges/:rangeSlug', () => {
  it('returns range details when found by the ranges service', async () => {
    const rangesService = {
      getRangeDetails: vi.fn().mockResolvedValue(
        Result.ok({
          id: 7,
          slug: 'forest-hills',
          displayName: 'Forest Hills',
          totalTracks: 10,
        }),
      ),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.get('/api/v1/ranges/:rangeSlug', GetRange);
      },
      dependencies: { rangesService },
    });

    const response = await client.get('/api/v1/ranges/forest-hills');

    expect(rangesService.getRangeDetails).toHaveBeenCalledWith('forest-hills');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: 7,
      slug: 'forest-hills',
      displayName: 'Forest Hills',
      totalTracks: 10,
    });
  });

  it('returns a not-found response when the range does not exist', async () => {
    const rangesService = {
      getRangeDetails: vi
        .fn()
        .mockResolvedValue(Result.fail(new RangeNotFoundError('Range not found'))),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.get('/api/v1/ranges/:rangeSlug', GetRange);
      },
      dependencies: { rangesService },
    });

    const response = await client.get('/api/v1/ranges/unknown');

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: 'Range not found',
    });
  });
});
