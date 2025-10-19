import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { UpdateRange } from '../../../src/worker/src/endpoints/v1/ranges/update-range';
import {
  ForbiddenError,
  RangeNotFoundError,
  Result,
  type UserDto,
} from '@strzel-sobie/common';

// chanfana extends Zod with an `openapi` helper at runtime; mirror that for isolated unit tests
if (typeof (z.ZodType.prototype as { openapi?: () => unknown }).openapi !== 'function') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (z.ZodType.prototype as any).openapi = function openapi() {
    return this;
  };
}

type UpdateRangeDependencies = {
  rangesService: {
    updateRangeDetails: ReturnType<typeof vi.fn>;
  };
  user: UserDto;
};

const createContext = ({ rangesService, user }: UpdateRangeDependencies) => {
  const json = vi.fn((payload: unknown, status?: number) => ({ payload, status }));
  const get = vi.fn((key: string) => {
    if (key === 'rangesService') {
      return rangesService;
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

const createUser = (): UserDto => ({
  id: 101,
  email: 'manager@example.com',
  isDeleted: 0,
  createdAt: '2024-03-10T08:30:00.000Z',
  roles: ['Manager'],
  rangeRoles: {},
});

describe('UpdateRange endpoint contract', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('updates range details and returns a success payload', async () => {
    const updateRangeEndpoint = new UpdateRange();
    const user = createUser();
    const rangesService = {
      updateRangeDetails: vi.fn().mockResolvedValue(Result.ok(true)),
    };
    const request = {
      params: { rangeSlug: 'central-range' },
      body: {
        totalTracks: 12,
        operatingHours: {
          monday: { open: '09:00', close: '18:00' },
          sunday: null,
        },
      },
    };

    const { ctx, spies } = createContext({ rangesService, user });

    const getValidatedDataSpy = vi
      .spyOn(updateRangeEndpoint, 'getValidatedData')
      .mockResolvedValue(request);

    const response = await updateRangeEndpoint.handle(ctx as never);

    expect(getValidatedDataSpy).toHaveBeenCalledOnce();
    expect(spies.get).toHaveBeenCalledWith('rangesService');
    expect(spies.get).toHaveBeenCalledWith('user');
    expect(rangesService.updateRangeDetails).toHaveBeenCalledWith(
      'central-range',
      {
        totalTracks: 12,
        operatingHours: {
          monday: { open: '09:00', close: '18:00' },
          sunday: null,
        },
      },
      user
    );
    expect(spies.json).not.toHaveBeenCalled();
    expect(response).toEqual({ success: true });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('maps a RangeNotFoundError to a 404 response', async () => {
    const updateRangeEndpoint = new UpdateRange();
    const user = createUser();
    const error = new RangeNotFoundError('central-range');
    const rangesService = {
      updateRangeDetails: vi.fn().mockResolvedValue(Result.fail(error)),
    };
    const request = {
      params: { rangeSlug: 'central-range' },
      body: {
        totalTracks: 8,
      },
    };

    const { ctx, spies } = createContext({ rangesService, user });

    vi.spyOn(updateRangeEndpoint, 'getValidatedData').mockResolvedValue(request);

    const response = await updateRangeEndpoint.handle(ctx as never);

    expect(rangesService.updateRangeDetails).toHaveBeenCalledWith(
      'central-range',
      { totalTracks: 8 },
      user
    );
    expect(spies.json).toHaveBeenCalledWith({ error: error.message }, 404);
    expect(response).toEqual({
      payload: { error: error.message },
      status: 404,
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(error);
  });

  it('maps a ForbiddenError to a 403 response', async () => {
    const updateRangeEndpoint = new UpdateRange();
    const user = createUser();
    const error = new ForbiddenError('User cannot update this range');
    const rangesService = {
      updateRangeDetails: vi.fn().mockResolvedValue(Result.fail(error)),
    };
    const request = {
      params: { rangeSlug: 'central-range' },
      body: {
        operatingHours: {
          monday: { open: '08:00', close: '16:00' },
        },
      },
    };

    const { ctx, spies } = createContext({ rangesService, user });

    vi.spyOn(updateRangeEndpoint, 'getValidatedData').mockResolvedValue(request);

    const response = await updateRangeEndpoint.handle(ctx as never);

    expect(rangesService.updateRangeDetails).toHaveBeenCalledWith(
      'central-range',
      {
        operatingHours: {
          monday: { open: '08:00', close: '16:00' },
        },
      },
      user
    );
    expect(spies.json).toHaveBeenCalledWith({ error: error.message }, 403);
    expect(response).toEqual({
      payload: { error: error.message },
      status: 403,
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(error);
  });

  it('returns a 500 response for unexpected errors', async () => {
    const updateRangeEndpoint = new UpdateRange();
    const user = createUser();
    const unexpectedError = new Error('database unavailable');
    const rangesService = {
      updateRangeDetails: vi.fn().mockResolvedValue(Result.fail(unexpectedError)),
    };
    const request = {
      params: { rangeSlug: 'central-range' },
      body: {
        totalTracks: 10,
      },
    };

    const { ctx, spies } = createContext({ rangesService, user });

    vi.spyOn(updateRangeEndpoint, 'getValidatedData').mockResolvedValue(request);

    const response = await updateRangeEndpoint.handle(ctx as never);

    expect(rangesService.updateRangeDetails).toHaveBeenCalledWith(
      'central-range',
      { totalTracks: 10 },
      user
    );
    expect(spies.json).toHaveBeenCalledWith(
      { error: 'An unexpected error occurred' },
      500
    );
    expect(response).toEqual({
      payload: { error: 'An unexpected error occurred' },
      status: 500,
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(unexpectedError);
  });
});
