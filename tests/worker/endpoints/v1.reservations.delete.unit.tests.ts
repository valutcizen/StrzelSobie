import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteReservation } from '../../../src/worker/src/endpoints/v1/reservations/delete-reservation';
import {
  ReservationCancellationError,
  ReservationNotFoundError,
  Result,
  type UserDto,
} from '@strzel-sobie/common';

type DeleteReservationDependencies = {
  reservationsService: {
    cancelReservation: ReturnType<typeof vi.fn>;
  };
  user: UserDto;
};

const createContext = ({ reservationsService, user }: DeleteReservationDependencies) => {
  const json = vi.fn((payload: unknown, status?: number) => ({ payload, status }));
  const get = vi.fn((key: string) => {
    if (key === 'reservationsService') {
      return reservationsService;
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
  email: 'guest@example.com',
  isDeleted: 0,
  createdAt: '2024-02-01T10:00:00.000Z',
  roles: [],
  rangeRoles: {},
});

describe('DeleteReservation endpoint contract', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns a 204 response when the reservation is cancelled successfully', async () => {
    const deleteEndpoint = new DeleteReservation();
    const user = createUser();
    const reservationsService = {
      cancelReservation: vi.fn().mockResolvedValue(Result.ok<void>(undefined)),
    };

    const { ctx, spies } = createContext({ reservationsService, user });

    const getValidatedDataSpy = vi
      .spyOn(deleteEndpoint, 'getValidatedData')
      .mockResolvedValue({ params: { reservationId: 12 } });

    const response = await deleteEndpoint.handle(ctx as never);

    expect(getValidatedDataSpy).toHaveBeenCalledOnce();
    expect(spies.get).toHaveBeenCalledWith('reservationsService');
    expect(spies.get).toHaveBeenCalledWith('user');
    expect(reservationsService.cancelReservation).toHaveBeenCalledWith(
      { reservationId: 12 },
      user,
    );
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(204);
    expect(spies.json).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('returns the mapped error response when cancellation fails due to a reservation domain error', async () => {
    const deleteEndpoint = new DeleteReservation();
    const user = createUser();
    const error = new ReservationNotFoundError();
    const reservationsService = {
      cancelReservation: vi.fn().mockResolvedValue(Result.fail<void>(error)),
    };

    const { ctx, spies } = createContext({ reservationsService, user });

    const getValidatedDataSpy = vi
      .spyOn(deleteEndpoint, 'getValidatedData')
      .mockResolvedValue({ params: { reservationId: 88 } });

    const response = await deleteEndpoint.handle(ctx as never);

    expect(getValidatedDataSpy).toHaveBeenCalledOnce();
    expect(reservationsService.cancelReservation).toHaveBeenCalledWith(
      { reservationId: 88 },
      user,
    );
    expect(spies.json).toHaveBeenCalledWith(
      { code: 'reservation_not_found', message: error.message },
      404,
    );
    expect(response).toEqual({
      payload: { code: 'reservation_not_found', message: error.message },
      status: 404,
    });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error during reservation cancellation', error);
  });

  it('logs unexpected failures and returns a 500 response when cancellation fails with an unknown error', async () => {
    const deleteEndpoint = new DeleteReservation();
    const user = createUser();
    const unexpectedError = new Error('database offline');
    const reservationsService = {
      cancelReservation: vi.fn().mockResolvedValue(Result.fail<void>(unexpectedError)),
    };

    const { ctx, spies } = createContext({ reservationsService, user });

    vi.spyOn(deleteEndpoint, 'getValidatedData').mockResolvedValue({
      params: { reservationId: 55 },
    });

    const response = await deleteEndpoint.handle(ctx as never);

    expect(reservationsService.cancelReservation).toHaveBeenCalledWith(
      { reservationId: 55 },
      user,
    );
    expect(spies.json).toHaveBeenCalledWith(
      { code: 'internal_error', message: 'Unexpected error occurred' },
      500,
    );
    expect(response).toEqual({
      payload: { code: 'internal_error', message: 'Unexpected error occurred' },
      status: 500,
    });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error during reservation cancellation', unexpectedError);
  });

  it('logs server errors produced by reservation cancellation failures', async () => {
    const deleteEndpoint = new DeleteReservation();
    const user = createUser();
    const cancellationError = new ReservationCancellationError();
    const reservationsService = {
      cancelReservation: vi.fn().mockResolvedValue(Result.fail<void>(cancellationError)),
    };

    const { ctx, spies } = createContext({ reservationsService, user });

    vi.spyOn(deleteEndpoint, 'getValidatedData').mockResolvedValue({
      params: { reservationId: 61 },
    });

    const response = await deleteEndpoint.handle(ctx as never);

    expect(reservationsService.cancelReservation).toHaveBeenCalledWith(
      { reservationId: 61 },
      user,
    );
    expect(spies.json).toHaveBeenCalledWith(
      {
        code: 'reservation_cancellation_failed',
        message: cancellationError.message,
      },
      500,
    );
    expect(response).toEqual({
      payload: {
        code: 'reservation_cancellation_failed',
        message: cancellationError.message,
      },
      status: 500,
    });
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error during reservation cancellation', cancellationError);
  });
});
