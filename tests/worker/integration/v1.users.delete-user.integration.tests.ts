import { describe, expect, it, vi } from 'vitest';
import { Result, UserNotFoundError, ForbiddenError } from '@strzel-sobie/common/models';
import { DeleteUserRoute } from '../../../src/worker/src/endpoints/v1/user/delete-user';
import { createWorkerTestClient } from '../utils/app';
import { mockConsoleError } from '../utils/console';

mockConsoleError();

const requester = {
  id: 2,
  email: 'admin@example.com',
  isDeleted: 0,
  createdAt: '2024-02-01T08:00:00.000Z',
  roles: [],
  rangeRoles: {},
};

describe('DELETE /api/v1/users/:userId', () => {
  it('soft-deletes the user and returns 204', async () => {
    const userService = {
      deleteUser: vi.fn().mockResolvedValue(Result.ok(undefined)),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.delete('/api/v1/users/:userId', DeleteUserRoute);
      },
      dependencies: { userService, user: requester },
    });

    const response = await client.delete('/api/v1/users/19');

    expect(userService.deleteUser).toHaveBeenCalledWith({
      targetUserId: 19,
      requester,
    });
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });

  it.each([
    [new UserNotFoundError('Missing'), 404],
    [new ForbiddenError('Forbidden'), 403],
  ])('maps %s to HTTP responses', async (error, expectedStatus) => {
    const userService = {
      deleteUser: vi.fn().mockResolvedValue(Result.fail(error)),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.delete('/api/v1/users/:userId', DeleteUserRoute);
      },
      dependencies: { userService, user: requester },
    });

    const response = await client.delete('/api/v1/users/19');

    expect(response.status).toBe(expectedStatus);
    expect(await response.json()).toEqual({ error: error.message });
  });
});
