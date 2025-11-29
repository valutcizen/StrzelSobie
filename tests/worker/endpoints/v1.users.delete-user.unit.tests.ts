import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Result, UserNotFoundError, ForbiddenError, type UserDto } from '@strzel-sobie/common/models';
import { DeleteUserRoute } from '../../../src/worker/src/endpoints/v1/user/delete-user';

type DeleteUserDependencies = {
  userService: {
    deleteUser: ReturnType<typeof vi.fn>;
  };
  user: UserDto;
};

const createUser = (): UserDto => ({
  id: 5,
  email: 'admin@example.com',
  isDeleted: 0,
  createdAt: '2024-03-01T10:00:00.000Z',
  roles: [],
  rangeRoles: {},
});

const createContext = ({ userService, user }: DeleteUserDependencies) => {
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

describe('DeleteUserRoute', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns 204 when deletion succeeds', async () => {
    const endpoint = new DeleteUserRoute();
    const user = createUser();
    const userService = {
      deleteUser: vi.fn().mockResolvedValue(Result.ok<void>(undefined)),
    };
    const { ctx, spies } = createContext({ userService, user });

    const getValidatedDataSpy = vi.spyOn(endpoint, 'getValidatedData').mockResolvedValue({
      params: { userId: '15' },
    });

    const response = await endpoint.handle(ctx as never);

    expect(getValidatedDataSpy).toHaveBeenCalledOnce();
    expect(userService.deleteUser).toHaveBeenCalledWith({
      targetUserId: 15,
      requester: user,
    });
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(204);
    expect(spies.json).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it.each([
    { error: new UserNotFoundError('User missing'), expectedStatus: 404 },
    { error: new ForbiddenError('Forbidden'), expectedStatus: 403 },
  ])('maps known errors to HTTP responses', async ({ error, expectedStatus }) => {
    const endpoint = new DeleteUserRoute();
    const user = createUser();
    const userService = {
      deleteUser: vi.fn().mockResolvedValue(Result.fail<void>(error as Error)),
    };
    const { ctx, spies } = createContext({ userService, user });

    vi.spyOn(endpoint, 'getValidatedData').mockResolvedValue({
      params: { userId: '20' },
    });

    const response = await endpoint.handle(ctx as never);

    expect(response).toEqual({ payload: { error: error.message }, status: expectedStatus });
    expect(spies.json).toHaveBeenCalledWith({ error: error.message }, expectedStatus);
  });

  it('returns 500 for unexpected errors', async () => {
    const endpoint = new DeleteUserRoute();
    const user = createUser();
    const failure = new Error('boom');
    const userService = {
      deleteUser: vi.fn().mockResolvedValue(Result.fail<void>(failure)),
    };
    const { ctx, spies } = createContext({ userService, user });

    vi.spyOn(endpoint, 'getValidatedData').mockResolvedValue({
      params: { userId: '21' },
    });

    const response = await endpoint.handle(ctx as never);

    expect(response).toEqual({ payload: { error: 'Internal Server Error' }, status: 500 });
    expect(spies.json).toHaveBeenCalledWith({ error: 'Internal Server Error' }, 500);
  });
});
