import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetUsers } from '../../../src/worker/src/endpoints/v1/user/get-users';
import { Result, type PaginatedUsersDto } from '@strzel-sobie/common';

type GetUsersDependencies = {
  userService: {
    getUsers: ReturnType<typeof vi.fn>;
  };
};

type TestContextOptions = {
  query: unknown;
  dependencies?: GetUsersDependencies;
};

const createContext = ({ query, dependencies }: TestContextOptions) => {
  const valid = vi.fn().mockReturnValue(query);
  const json = vi.fn((payload: unknown, status?: number) => ({ payload, status }));
  const get = vi.fn((key: string) => {
    if (key === 'userService') {
      return dependencies?.userService;
    }
    return undefined;
  });

  const ctx = {
    req: {
      valid,
    },
    json,
    get,
  };

  return {
    ctx,
    spies: {
      reqValid: valid,
      json,
      get,
    },
  };
};

describe('GetUsers endpoint contract', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns fetched users when the service succeeds', async () => {
    const endpoint = new GetUsers();
    const query = {
      page: 2,
      limit: 5,
      sortBy: 'email',
      sortOrder: 'asc',
      filter: 'member',
    };
    const paginatedUsers: PaginatedUsersDto = {
      data: [
        {
          id: 42,
          email: 'member@example.com',
          isDeleted: 0,
          createdAt: '2024-02-10T10:00:00.000Z',
          roles: [],
          rangeRoles: {},
        },
      ],
      pagination: {
        total: 1,
        page: 2,
        limit: 5,
      },
    };
    const userService = {
      getUsers: vi.fn().mockResolvedValue(Result.ok(paginatedUsers)),
    };

    const { ctx, spies } = createContext({ query, dependencies: { userService } });

    const response = await endpoint.handle(ctx as never);

    expect(spies.reqValid).toHaveBeenCalledOnce();
    expect(spies.reqValid).toHaveBeenCalledWith('query');
    expect(spies.get).toHaveBeenCalledWith('userService');
    expect(userService.getUsers).toHaveBeenCalledWith(query);
    expect(spies.json).toHaveBeenCalledWith(paginatedUsers);
    expect(response).toEqual({ payload: paginatedUsers, status: undefined });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('returns a 500 response with the error message when the service fails', async () => {
    const endpoint = new GetUsers();
    const query = { page: 1, limit: 10 };
    const error = new Error('Failed to list users');
    const userService = {
      getUsers: vi.fn().mockResolvedValue(Result.fail<PaginatedUsersDto>(error)),
    };

    const { ctx, spies } = createContext({ query, dependencies: { userService } });

    const response = await endpoint.handle(ctx as never);

    expect(spies.reqValid).toHaveBeenCalledOnce();
    expect(spies.reqValid).toHaveBeenCalledWith('query');
    expect(spies.get).toHaveBeenCalledWith('userService');
    expect(userService.getUsers).toHaveBeenCalledWith(query);
    expect(spies.json).toHaveBeenCalledWith({ error: error.message }, 500);
    expect(response).toEqual({ payload: { error: error.message }, status: 500 });
  });
});
