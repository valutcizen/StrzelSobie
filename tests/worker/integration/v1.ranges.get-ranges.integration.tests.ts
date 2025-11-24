import { describe, expect, it, vi } from 'vitest';
import { Result } from '@strzel-sobie/common';
import { GetRangesRoute } from '../../../src/worker/src/endpoints/v1/ranges/get-ranges';
import { createWorkerTestClient } from '../utils/app';
import { mockConsoleError } from '../utils/console';

mockConsoleError();

describe('GET /api/v1/ranges', () => {
  it('returns ranges retrieved from the ranges service', async () => {
    const rangesService = {
      getRanges: vi.fn().mockResolvedValue(
        Result.ok([
          { id: 1, slug: 'downtown', displayName: 'Downtown Range', type: 'club', allowsReservations: true },
          { id: 2, slug: 'lakeside', displayName: 'Lakeside Range', type: 'club', allowsReservations: true },
        ]),
      ),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.get('/api/v1/ranges', GetRangesRoute);
      },
      dependencies: { rangesService },
    });

    const response = await client.get('/api/v1/ranges');

    expect(rangesService.getRanges).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      { id: 1, slug: 'downtown', displayName: 'Downtown Range', type: 'club', allowsReservations: true },
      { id: 2, slug: 'lakeside', displayName: 'Lakeside Range', type: 'club', allowsReservations: true },
    ]);
  });

  it('responds with 500 when the ranges service fails', async () => {
    const rangesService = {
      getRanges: vi.fn().mockResolvedValue(Result.fail(new Error('db error'))),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.get('/api/v1/ranges', GetRangesRoute);
      },
      dependencies: { rangesService },
    });

    const response = await client.get('/api/v1/ranges');

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal Server Error' });
  });
});
