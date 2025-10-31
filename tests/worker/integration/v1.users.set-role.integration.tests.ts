import { describe, expect, it, vi } from 'vitest';
import {
  Result,
  UserNotFoundError,
  UserDoesNotHaveRoleError,
  Role,
  UserIdentifierDto,
  RoleNotFoundError,
  RangeNotFoundError,
  RoleScopeError,
  ForbiddenError,
} from '@strzel-sobie/common/models';
import { SetUserRoleRoute } from '../../../src/worker/src/endpoints/v1/user/set-role';
import { createWorkerTestClient } from '../utils/app';
import { mockConsoleError } from '../utils/console';

mockConsoleError();

const requester = {
  id: 3,
  email: 'admin@example.com',
  isDeleted: 0,
  createdAt: '2024-03-01T12:00:00.000Z',
  roles: [],
  rangeRoles: {},
};

describe('POST /api/v1/users/:userId/roles', () => {
  it('assigns a role using the user service and returns 204 on success', async () => {
    const userService = {
      assignRoleToUser: vi.fn().mockResolvedValue(Result.ok(undefined)),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.post('/api/v1/users/:userId/roles', SetUserRoleRoute);
      },
      dependencies: { userService, user: requester },
    });

    const response = await client.post('/api/v1/users/12/roles', {
      json: { roleId: 5, rangeId: 9 },
    });

    expect(userService.assignRoleToUser).toHaveBeenCalledWith({
      targetUserId: 12,
      roleId: 5,
      rangeId: 9,
      requester,
    });
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });

  it.each([
    [new RoleNotFoundError('Role missing'), 404],
    [new RangeNotFoundError('Range missing'), 404],
    [new RoleScopeError('Invalid scope'), 400],
    [new ForbiddenError('Forbidden'), 403],
  ])('translates %s into the correct HTTP error', async (error, expectedStatus) => {
    const userService = {
      assignRoleToUser: vi.fn().mockResolvedValue(Result.fail(error)),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.post('/api/v1/users/:userId/roles', SetUserRoleRoute);
      },
      dependencies: { userService, user: requester },
    });

    const response = await client.post('/api/v1/users/12/roles', {
      json: { roleId: 5, rangeId: 9 },
    });

    expect(response.status).toBe(expectedStatus);
    expect(await response.json()).toEqual({ error: error.message });
  });
});
