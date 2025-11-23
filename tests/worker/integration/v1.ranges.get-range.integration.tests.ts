import { describe, expect, it, vi } from 'vitest';
import { RangeNotFoundError, Result } from '@strzel-sobie/common/models';
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

  it('builds the authenticated user payload before requesting range details', async () => {
    vi.useFakeTimers();
    const fixedDate = new Date('2024-05-05T10:00:00.000Z');
    vi.setSystemTime(fixedDate);

    try {
      const rangesService = {
        getRangeDetails: vi.fn().mockResolvedValue(
          Result.ok({
            id: 7,
            slug: 'forest-hills',
            displayName: 'Forest Hills',
          }),
        ),
      };
      const authService = {
        validateSession: vi.fn().mockResolvedValue(
          Result.ok({
            userId: 42,
            email: 'member@example.com',
            phoneNumber: '+48123456789',
            roles: ['Member'],
            rangeRoles: {
              '9': ['Range Officer'],
            },
          }),
        ),
      };
      const userService = {
        getFullUserProfile: vi.fn().mockResolvedValue(
          Result.ok({
            id: 42,
            email: 'member@example.com',
            phoneNumber: '+48123456789',
            roles: ['Member', 'Guest'],
            rangeRoles: {
              '9': ['Range Officer', 'Unknown Range Role'],
            },
          }),
        ),
        getRoles: vi.fn().mockResolvedValue(
          Result.ok([
            { id: 1, name: 'Member', scope: 'global' },
            { id: 2, name: 'Range Officer', scope: 'range' },
          ]),
        ),
      };

      const { client } = createWorkerTestClient({
        register: (router) => {
          router.get('/api/v1/ranges/:rangeSlug', GetRange);
        },
        dependencies: { rangesService, authService, userService },
      });

      const response = await client.get('/api/v1/ranges/forest-hills', {
        headers: {
          Cookie: 'session_token=valid-session',
        },
      });

      expect(authService.validateSession).toHaveBeenCalledWith('valid-session');
      expect(userService.getFullUserProfile).toHaveBeenCalledWith(42);
      expect(userService.getRoles).toHaveBeenCalledOnce();
      expect(rangesService.getRangeDetails).toHaveBeenCalledWith('forest-hills', {
        id: 42,
        email: 'member@example.com',
        isDeleted: 0,
        createdAt: fixedDate.toISOString(),
        roles: [{ id: 1, name: 'Member', scope: 'global' }],
        rangeRoles: { '9': [{ id: 2, name: 'Range Officer', scope: 'range' }] },
        range_roles: { '9': [{ id: 2, name: 'Range Officer', scope: 'range' }] },
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        id: 7,
        slug: 'forest-hills',
        displayName: 'Forest Hills',
      });
    } finally {
      vi.useRealTimers();
    }
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

  it('returns a 500 response for unexpected errors', async () => {
    const rangesService = {
      getRangeDetails: vi.fn().mockResolvedValue(Result.fail(new Error('database offline'))),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.get('/api/v1/ranges/:rangeSlug', GetRange);
      },
      dependencies: { rangesService },
    });

    const response = await client.get('/api/v1/ranges/forest-hills');

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: 'Failed to fetch range details',
    });
  });
});
