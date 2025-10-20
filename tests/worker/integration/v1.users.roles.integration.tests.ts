import { describe, expect, it, vi } from 'vitest';
import { Result } from '@strzel-sobie/common';
import { GetRoles } from '../../../src/worker/src/endpoints/v1/user/roles';
import { createWorkerTestClient } from '../utils/app';
import { mockConsoleError } from '../utils/console';

mockConsoleError();

describe('GET /api/v1/user/roles', () => {
  it('returns role definitions fetched from the user service', async () => {
    const userService = {
      getRoles: vi.fn().mockResolvedValue(
        Result.ok([
          { id: 1, name: 'Member', scope: 'global' },
          { id: 2, name: 'Range Officer', scope: 'range' },
        ]),
      ),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.get('/api/v1/user/roles', GetRoles);
      },
      dependencies: { userService },
    });

    const response = await client.get('/api/v1/user/roles');

    expect(userService.getRoles).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      { id: 1, name: 'Member', scope: 'global' },
      { id: 2, name: 'Range Officer', scope: 'range' },
    ]);
  });

  it('returns 500 when retrieving roles fails', async () => {
    const userService = {
      getRoles: vi.fn().mockResolvedValue(Result.fail(new Error('boom'))),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.get('/api/v1/user/roles', GetRoles);
      },
      dependencies: { userService },
    });

    const response = await client.get('/api/v1/user/roles');

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: 'Failed to retrieve roles' });
  });
});
