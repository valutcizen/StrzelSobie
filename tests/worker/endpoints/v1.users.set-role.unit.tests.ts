import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SetUserRoleRoute } from '../../../src/worker/src/endpoints/v1/user/set-role';
import {
  ForbiddenError,
  RangeNotFoundError,
  Result,
  RoleNotFoundError,
  RoleScopeError,
  UserNotFoundError,
  type UserDto,
} from '@strzel-sobie/common';

type SetRoleDependencies = {
  userService: {
    assignRoleToUser: ReturnType<typeof vi.fn>;
  };
  user: UserDto;
};

const createUser = (): UserDto => ({
  id: 21,
  email: 'admin@example.com',
  isDeleted: 0,
  createdAt: '2024-03-02T12:00:00.000Z',
  roles: [],
  rangeRoles: {},
});

const createContext = ({ userService, user }: SetRoleDependencies) => {
  const json = vi.fn((payload: unknown, status?: number) => ({ payload, status }));
  const get = vi.fn((key: string) => {
    if (key === 'userService') {
      return userService;
    }
    if (key === 'user') {
      return user;
    }
    return undefined;
  });

  const ctx = {
    json,
    get,
  };

  return {
    ctx,
    spies: {
      json,
      get,
    },
  };
};

describe('SetUserRoleRoute', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns a 204 response when the role is assigned successfully', async () => {
    const endpoint = new SetUserRoleRoute();
    const user = createUser();
    const userService = {
      assignRoleToUser: vi.fn().mockResolvedValue(Result.ok<void>(undefined)),
    };
    const { ctx, spies } = createContext({ userService, user });

    const getValidatedDataSpy = vi.spyOn(endpoint, 'getValidatedData').mockResolvedValue({
      params: { userId: '17' },
      body: { roleId: 5, rangeId: 11 },
    });

    const response = await endpoint.handle(ctx as never);

    expect(getValidatedDataSpy).toHaveBeenCalledOnce();
    expect(userService.assignRoleToUser).toHaveBeenCalledWith({
      targetUserId: 17,
      roleId: 5,
      rangeId: 11,
      requester: user,
    });
    expect(spies.get).toHaveBeenCalledWith('userService');
    expect(spies.get).toHaveBeenCalledWith('user');
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(204);
    expect(spies.json).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'UserNotFoundError', error: new UserNotFoundError('User does not exist') },
    { label: 'RoleNotFoundError', error: new RoleNotFoundError('Role does not exist') },
    { label: 'RangeNotFoundError', error: new RangeNotFoundError('Range does not exist') },
  ])('returns a 404 response when assignRoleToUser fails with %s', async ({ error }) => {
    const endpoint = new SetUserRoleRoute();
    const user = createUser();
    const userService = {
      assignRoleToUser: vi.fn().mockImplementation(async () => Result.fail<void>(error)),
    };
    const { ctx, spies } = createContext({ userService, user });

    vi.spyOn(endpoint, 'getValidatedData').mockResolvedValue({
      params: { userId: '42' },
      body: { roleId: 6, rangeId: null },
    });

    const response = await endpoint.handle(ctx as never);

    expect(userService.assignRoleToUser).toHaveBeenCalledWith({
      targetUserId: 42,
      roleId: 6,
      rangeId: null,
      requester: user,
    });
    expect(spies.json).toHaveBeenCalledWith({ error: error.message }, 404);
    expect(response).toEqual({
      payload: { error: error.message },
      status: 404,
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(error);
  });

  it('returns a 400 response when assignRoleToUser fails with RoleScopeError', async () => {
    const endpoint = new SetUserRoleRoute();
    const user = createUser();
    const error = new RoleScopeError('Role scope mismatch');
    const userService = {
      assignRoleToUser: vi.fn().mockImplementation(async () => Result.fail<void>(error)),
    };
    const { ctx, spies } = createContext({ userService, user });

    vi.spyOn(endpoint, 'getValidatedData').mockResolvedValue({
      params: { userId: '31' },
      body: { roleId: 7, rangeId: null },
    });

    const response = await endpoint.handle(ctx as never);

    expect(userService.assignRoleToUser).toHaveBeenCalledWith({
      targetUserId: 31,
      roleId: 7,
      rangeId: null,
      requester: user,
    });
    expect(spies.json).toHaveBeenCalledWith({ error: error.message }, 400);
    expect(response).toEqual({
      payload: { error: error.message },
      status: 400,
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(error);
  });

  it('returns a 403 response when assignRoleToUser fails with ForbiddenError', async () => {
    const endpoint = new SetUserRoleRoute();
    const user = createUser();
    const error = new ForbiddenError('Not authorized to assign role');
    const userService = {
      assignRoleToUser: vi.fn().mockImplementation(async () => Result.fail<void>(error)),
    };
    const { ctx, spies } = createContext({ userService, user });

    vi.spyOn(endpoint, 'getValidatedData').mockResolvedValue({
      params: { userId: '58' },
      body: { roleId: 3, rangeId: 12 },
    });

    const response = await endpoint.handle(ctx as never);

    expect(userService.assignRoleToUser).toHaveBeenCalledWith({
      targetUserId: 58,
      roleId: 3,
      rangeId: 12,
      requester: user,
    });
    expect(spies.json).toHaveBeenCalledWith({ error: error.message }, 403);
    expect(response).toEqual({
      payload: { error: error.message },
      status: 403,
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(error);
  });

  it('returns a 500 response when assignRoleToUser fails with an unexpected error', async () => {
    const endpoint = new SetUserRoleRoute();
    const user = createUser();
    const unexpectedError = new Error('database down');
    const userService = {
      assignRoleToUser: vi.fn().mockImplementation(async () => Result.fail<void>(unexpectedError)),
    };
    const { ctx, spies } = createContext({ userService, user });

    vi.spyOn(endpoint, 'getValidatedData').mockResolvedValue({
      params: { userId: '19' },
      body: { roleId: 4, rangeId: null },
    });

    const response = await endpoint.handle(ctx as never);

    expect(userService.assignRoleToUser).toHaveBeenCalledWith({
      targetUserId: 19,
      roleId: 4,
      rangeId: null,
      requester: user,
    });
    expect(spies.json).toHaveBeenCalledWith({ error: 'Internal Server Error' }, 500);
    expect(response).toEqual({
      payload: { error: 'Internal Server Error' },
      status: 500,
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(unexpectedError);
  });
});
