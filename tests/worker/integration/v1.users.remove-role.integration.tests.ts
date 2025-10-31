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
import { RemoveUserRoleRoute } from '../../../src/worker/src/endpoints/v1/user/remove-role';
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

describe('DELETE /api/v1/users/:userId/roles/:roleId', () => {
  it('removes a user role and returns 204', async () => {
    const userService = {
      removeRoleFromUser: vi.fn().mockResolvedValue(Result.ok(undefined)),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.delete('/api/v1/users/:userId/roles/:roleId', RemoveUserRoleRoute);
      },
      dependencies: { userService, user: requester },
    });

    const response = await client.delete('/api/v1/users/21/roles/7?rangeId=12');

    expect(userService.removeRoleFromUser).toHaveBeenCalledWith({
      targetUserId: 21,
      roleId: 7,
      rangeId: 12,
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
  ])('maps %s to a proper HTTP response', async (error, expectedStatus) => {
    const userService = {
      removeRoleFromUser: vi.fn().mockResolvedValue(Result.fail(error)),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.delete('/api/v1/users/:userId/roles/:roleId', RemoveUserRoleRoute);
      },
      dependencies: { userService, user: requester },
    });

    const response = await client.delete('/api/v1/users/21/roles/7?rangeId=12');

    expect(response.status).toBe(expectedStatus);
    expect(await response.json()).toEqual({ error: error.message });
  });
});
