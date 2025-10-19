import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetRoles } from '../../../src/worker/src/endpoints/v1/user/roles';
import { Result, type Role } from '@strzel-sobie/common';

type GetRolesDependencies = {
  userService: {
    getRoles: ReturnType<typeof vi.fn>;
  };
};

const createContext = ({ userService }: GetRolesDependencies) => {
  const json = vi.fn((payload: unknown, status?: number) => ({ payload, status }));
  const get = vi.fn((key: string) => {
    if (key === 'userService') {
      return userService;
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

describe('GetRoles endpoint contract', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns all roles when the service succeeds', async () => {
    const endpoint = new GetRoles();
    const roles: Role[] = [
      { id: 1, name: 'Member', scope: 'global' },
      { id: 2, name: 'Range Supervisor', scope: 'range' },
    ];
    const userService = {
      getRoles: vi.fn().mockResolvedValue(Result.ok(roles)),
    };
    const { ctx, spies } = createContext({ userService });

    const response = await endpoint.handle(ctx as never);

    expect(spies.get).toHaveBeenCalledWith('userService');
    expect(userService.getRoles).toHaveBeenCalledOnce();
    expect(spies.json).toHaveBeenCalledWith(roles);
    expect(response).toEqual({ payload: roles, status: undefined });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('returns a 500 response when the service fails', async () => {
    const endpoint = new GetRoles();
    const error = new Error('database unavailable');
    const userService = {
      getRoles: vi.fn().mockImplementation(async () => Result.fail<Role[]>(error)),
    };
    const { ctx, spies } = createContext({ userService });

    const response = await endpoint.handle(ctx as never);

    expect(spies.get).toHaveBeenCalledWith('userService');
    expect(userService.getRoles).toHaveBeenCalledOnce();
    expect(spies.json).toHaveBeenCalledWith({ message: 'Failed to retrieve roles' }, 500);
    expect(response).toEqual({
      payload: { message: 'Failed to retrieve roles' },
      status: 500,
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(error);
  });
});
