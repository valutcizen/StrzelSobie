import { describe, expect, it, vi } from 'vitest';
import { Result } from '@strzel-sobie/common';
import { GetMapRangesRoute } from '../../../src/worker/src/endpoints/v1/ranges/get-map-ranges';
import { createWorkerTestClient } from '../utils/app';
import { mockConsoleError } from '../utils/console';

mockConsoleError();

describe('GET /api/v1/map-ranges', () => {
  it('applies embed scope config filters when scope=embed', async () => {
    const rangesService = {
      getRanges: vi.fn().mockResolvedValue(
        Result.ok([
          {
            id: 1,
            slug: 'club-a',
            displayName: 'Club A',
            type: 'club',
            allowsReservations: true,
            latitude: 50.1,
            longitude: 19.1,
          },
        ]),
      ),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.get('/api/v1/map-ranges', GetMapRangesRoute);
      },
      dependencies: {
        rangesService,
        embedMapConfig: {
          allowedTypes: ['club', 'office'],
          cacheVersion: '5',
        },
      },
    });

    const response = await client.get('/api/v1/map-ranges?scope=embed');

    expect(response.status).toBe(200);
    expect(rangesService.getRanges).toHaveBeenCalledWith({ types: ['club', 'office'] });
  });

  it('returns 400 for invalid type query', async () => {
    const rangesService = {
      getRanges: vi.fn(),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.get('/api/v1/map-ranges', GetMapRangesRoute);
      },
      dependencies: { rangesService },
    });

    const response = await client.get('/api/v1/map-ranges?type=invalid');

    expect(response.status).toBe(400);
    expect(rangesService.getRanges).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: 'Invalid range type filter' });
  });
});

