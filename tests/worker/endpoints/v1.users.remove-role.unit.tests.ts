import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RemoveUserRoleRoute } from '../../../src/worker/src/endpoints/v1/user/remove-role';
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
  UserDto,
} from '@strzel-sobie/common/models';

type RemoveRoleDependencies = {
  userService: {
    removeRoleFromUser: ReturnType<typeof vi.fn>;
  };
  user: UserDto;
};

const createUser = (): UserDto => ({
  id: 7,
  email: 'admin@example.com',
  isDeleted: 0,
  createdAt: '2024-03-02T12:00:00.000Z',
  roles: [],
  rangeRoles: {},
});

const createContext = ({ userService, user }: RemoveRoleDependencies) => {
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

describe('RemoveUserRoleRoute', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns a 204 response when the role is removed successfully', async () => {
    const endpoint = new RemoveUserRoleRoute();
    const user = createUser();
    const userService = {
      removeRoleFromUser: vi.fn().mockResolvedValue(Result.ok<void>(undefined)),
    };
    const { ctx, spies } = createContext({ userService, user });

    const getValidatedDataSpy = vi.spyOn(endpoint, 'getValidatedData').mockResolvedValue({
      params: { userId: '42', roleId: '5' },
      query: { rangeId: '9' },
    });

    const response = await endpoint.handle(ctx as never);

    expect(getValidatedDataSpy).toHaveBeenCalledOnce();
    expect(userService.removeRoleFromUser).toHaveBeenCalledWith({
      targetUserId: 42,
      roleId: 5,
      rangeId: 9,
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
  ])('returns a 404 response when removeRoleFromUser fails with %s', async ({ error }) => {
    const endpoint = new RemoveUserRoleRoute();
    const user = createUser();
    const userService = {
      removeRoleFromUser: vi
        .fn()
        .mockImplementation(async () => Result.fail<void>(error)),
    };
    const { ctx, spies } = createContext({ userService, user });

    vi.spyOn(endpoint, 'getValidatedData').mockResolvedValue({
      params: { userId: '51', roleId: '8' },
      query: {},
    });

    const response = await endpoint.handle(ctx as never);

    expect(userService.removeRoleFromUser).toHaveBeenCalledWith({
      targetUserId: 51,
      roleId: 8,
      rangeId: null,
      requester: user,
    });
    expect(spies.json).toHaveBeenCalledWith({ error: error.message }, 404);
    expect(response).toEqual({
      payload: { error: error.message },
      status: 404,
    });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error while removing role from user', error);
  });

  it('returns a 400 response when removeRoleFromUser fails with RoleScopeError', async () => {
    const endpoint = new RemoveUserRoleRoute();
    const user = createUser();
    const error = new RoleScopeError('Role scope mismatch');
    const userService = {
      removeRoleFromUser: vi
        .fn()
        .mockImplementation(async () => Result.fail<void>(error)),
    };
    const { ctx, spies } = createContext({ userService, user });

    vi.spyOn(endpoint, 'getValidatedData').mockResolvedValue({
      params: { userId: '11', roleId: '4' },
      query: {},
    });

    const response = await endpoint.handle(ctx as never);

    expect(userService.removeRoleFromUser).toHaveBeenCalledWith({
      targetUserId: 11,
      roleId: 4,
      rangeId: null,
      requester: user,
    });
    expect(spies.json).toHaveBeenCalledWith({ error: error.message }, 400);
    expect(response).toEqual({
      payload: { error: error.message },
      status: 400,
    });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error while removing role from user', error);
  });

  it('returns a 403 response when removeRoleFromUser fails with ForbiddenError', async () => {
    const endpoint = new RemoveUserRoleRoute();
    const user = createUser();
    const error = new ForbiddenError('Not authorized to remove role');
    const userService = {
      removeRoleFromUser: vi
        .fn()
        .mockImplementation(async () => Result.fail<void>(error)),
    };
    const { ctx, spies } = createContext({ userService, user });

    vi.spyOn(endpoint, 'getValidatedData').mockResolvedValue({
      params: { userId: '73', roleId: '2' },
      query: { rangeId: '6' },
    });

    const response = await endpoint.handle(ctx as never);

    expect(userService.removeRoleFromUser).toHaveBeenCalledWith({
      targetUserId: 73,
      roleId: 2,
      rangeId: 6,
      requester: user,
    });
    expect(spies.json).toHaveBeenCalledWith({ error: error.message }, 403);
    expect(response).toEqual({
      payload: { error: error.message },
      status: 403,
    });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error while removing role from user', error);
  });

  it('returns a 500 response when removeRoleFromUser fails with an unexpected error', async () => {
    const endpoint = new RemoveUserRoleRoute();
    const user = createUser();
    const unexpectedError = new Error('database down');
    const userService = {
      removeRoleFromUser: vi
        .fn()
        .mockImplementation(async () => Result.fail<void>(unexpectedError)),
    };
    const { ctx, spies } = createContext({ userService, user });

    vi.spyOn(endpoint, 'getValidatedData').mockResolvedValue({
      params: { userId: '14', roleId: '3' },
      query: {},
    });

    const response = await endpoint.handle(ctx as never);

    expect(userService.removeRoleFromUser).toHaveBeenCalledWith({
      targetUserId: 14,
      roleId: 3,
      rangeId: null,
      requester: user,
    });
    expect(spies.json).toHaveBeenCalledWith({ error: 'Internal Server Error' }, 500);
    expect(response).toEqual({
      payload: { error: 'Internal Server Error' },
      status: 500,
    });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error while removing role from user', unexpectedError);
  });
});
