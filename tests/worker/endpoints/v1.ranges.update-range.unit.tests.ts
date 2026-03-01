import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { UpdateRange } from '../../../src/worker/src/endpoints/v1/ranges/update-range';
import {
  RangeTypeChangeConfirmationRequiredError,
  Result,
  RangeNotFoundError,
  UserDoesNotHavePermissionError,
  UserDoesNotHaveRoleError,
  ForbiddenError,
  UpdateRangeDto,
  UserDto,
} from '@strzel-sobie/common/models';

// chanfana extends Zod with an `openapi` helper at runtime; mirror that for isolated unit tests
if (typeof (z.ZodType.prototype as { openapi?: () => unknown }).openapi !== 'function') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (z.ZodType.prototype as any).openapi = function openapi() {
    return this;
  };
}

type UpdateRangeDependencies = {
  rangesService: {
    previewRangeTypeChange: ReturnType<typeof vi.fn>;
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
      previewRangeTypeChange: vi.fn().mockResolvedValue(Result.ok({
        nextType: 'club',
        futureReservations: 0,
        futureEvents: 0,
        requiresConfirmation: false,
      })),
      updateRangeDetails: vi.fn().mockResolvedValue(Result.ok(true)),
    };
    const request = {
      params: { rangeSlug: 'central-range' },
      query: { dryRun: false },
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
    expect(rangesService.previewRangeTypeChange).not.toHaveBeenCalled();
    expect(rangesService.updateRangeDetails).toHaveBeenCalledWith(
      'central-range',
      {
        totalTracks: 12,
        operatingHours: {
          monday: { open: '09:00', close: '18:00' },
          sunday: null,
        },
      },
      user,
      { confirmTypeChange: undefined }
    );
    expect(spies.json).toHaveBeenCalledWith({ success: true }, 200);
    expect(response).toEqual({
      payload: { success: true },
      status: 200,
    });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('maps a RangeNotFoundError to a 404 response', async () => {
    const updateRangeEndpoint = new UpdateRange();
    const user = createUser();
    const error = new RangeNotFoundError('central-range');
    const rangesService = {
      previewRangeTypeChange: vi.fn().mockResolvedValue(Result.ok({
        nextType: 'club',
        futureReservations: 0,
        futureEvents: 0,
        requiresConfirmation: false,
      })),
      updateRangeDetails: vi.fn().mockResolvedValue(Result.fail(error)),
    };
    const request = {
      params: { rangeSlug: 'central-range' },
      query: { dryRun: false },
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
      user,
      { confirmTypeChange: undefined }
    );
    expect(spies.json).toHaveBeenCalledWith({ error: error.message }, 404);
    expect(response).toEqual({
      payload: { error: error.message },
      status: 404,
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error while updating range', error);
  });

  it('maps a ForbiddenError to a 403 response', async () => {
    const updateRangeEndpoint = new UpdateRange();
    const user = createUser();
    const error = new ForbiddenError('User cannot update this range');
    const rangesService = {
      previewRangeTypeChange: vi.fn().mockResolvedValue(Result.ok({
        nextType: 'club',
        futureReservations: 0,
        futureEvents: 0,
        requiresConfirmation: false,
      })),
      updateRangeDetails: vi.fn().mockResolvedValue(Result.fail(error)),
    };
    const request = {
      params: { rangeSlug: 'central-range' },
      query: { dryRun: false },
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
      user,
      { confirmTypeChange: undefined }
    );
    expect(spies.json).toHaveBeenCalledWith({ error: error.message }, 403);
    expect(response).toEqual({
      payload: { error: error.message },
      status: 403,
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error while updating range', error);
  });

  it('returns a 500 response for unexpected errors', async () => {
    const updateRangeEndpoint = new UpdateRange();
    const user = createUser();
    const unexpectedError = new Error('database unavailable');
    const rangesService = {
      previewRangeTypeChange: vi.fn().mockResolvedValue(Result.ok({
        nextType: 'club',
        futureReservations: 0,
        futureEvents: 0,
        requiresConfirmation: false,
      })),
      updateRangeDetails: vi.fn().mockResolvedValue(Result.fail(unexpectedError)),
    };
    const request = {
      params: { rangeSlug: 'central-range' },
      query: { dryRun: false },
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
      user,
      { confirmTypeChange: undefined }
    );
    expect(spies.json).toHaveBeenCalledWith(
      { error: 'An unexpected error occurred' },
      500
    );
    expect(response).toEqual({
      payload: { error: 'An unexpected error occurred' },
      status: 500,
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error while updating range', unexpectedError);
  });

  it('returns dry-run preview for type changes', async () => {
    const updateRangeEndpoint = new UpdateRange();
    const user = createUser();
    const preview = {
      nextType: 'office',
      futureReservations: 2,
      futureEvents: 1,
      requiresConfirmation: true,
    };
    const rangesService = {
      previewRangeTypeChange: vi.fn().mockResolvedValue(Result.ok(preview)),
      updateRangeDetails: vi.fn(),
    };
    const request = {
      params: { rangeSlug: 'central-range' },
      query: { dryRun: true },
      body: { type: 'office' },
    };
    const { ctx, spies } = createContext({ rangesService, user });
    vi.spyOn(updateRangeEndpoint, 'getValidatedData').mockResolvedValue(request);

    const response = await updateRangeEndpoint.handle(ctx as never);

    expect(rangesService.previewRangeTypeChange).toHaveBeenCalledWith('central-range', 'office', user);
    expect(rangesService.updateRangeDetails).not.toHaveBeenCalled();
    expect(spies.json).toHaveBeenCalledWith(preview, 200);
    expect(response).toEqual({ payload: preview, status: 200 });
  });

  it('maps confirmation-required error to 409', async () => {
    const updateRangeEndpoint = new UpdateRange();
    const user = createUser();
    const rangesService = {
      previewRangeTypeChange: vi.fn().mockResolvedValue(Result.ok({
        nextType: 'office',
        futureReservations: 1,
        futureEvents: 0,
        requiresConfirmation: true,
      })),
      updateRangeDetails: vi.fn().mockResolvedValue(
        Result.fail(
          new RangeTypeChangeConfirmationRequiredError({
            nextType: 'office',
            futureReservations: 1,
            futureEvents: 0,
          }),
        ),
      ),
    };
    const request = {
      params: { rangeSlug: 'central-range' },
      query: { dryRun: false },
      body: { type: 'office' },
    };
    const { ctx, spies } = createContext({ rangesService, user });
    vi.spyOn(updateRangeEndpoint, 'getValidatedData').mockResolvedValue(request);

    const response = await updateRangeEndpoint.handle(ctx as never);

    expect(rangesService.updateRangeDetails).toHaveBeenCalledWith(
      'central-range',
      { type: 'office' },
      user,
      { confirmTypeChange: undefined },
    );
    expect(spies.json).toHaveBeenCalledWith(
      {
        error: 'Range type change requires explicit confirmation due to future availability impact',
        code: 'range_type_change_confirmation_required',
        details: {
          nextType: 'office',
          futureReservations: 1,
          futureEvents: 0,
        },
      },
      409,
    );
    expect(response).toEqual({
      payload: {
        error: 'Range type change requires explicit confirmation due to future availability impact',
        code: 'range_type_change_confirmation_required',
        details: {
          nextType: 'office',
          futureReservations: 1,
          futureEvents: 0,
        },
      },
      status: 409,
    });
  });
});
