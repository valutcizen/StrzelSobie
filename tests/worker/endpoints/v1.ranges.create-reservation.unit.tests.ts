import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateReservation } from '../../../src/worker/src/endpoints/v1/ranges/create-reservation';
import {
  Result,
  InvalidTimeRangeError,
  NoAvailableSpotsError,
  ReservationInPastError,
  UserDoesNotHavePermissionError,
  CreateReservationCommand,
  CreatedReservationDto,
  RangeNotFoundError,
  UserDto,
} from '@strzel-sobie/common/models';

type CreateReservationDependencies = {
  reservationsService: {
    createReservation: ReturnType<typeof vi.fn>;
  };
  user: UserDto;
};

const createContext = ({ reservationsService, user }: CreateReservationDependencies) => {
  const header = vi.fn();
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
    header,
    json,
    get,
  };

  return {
    ctx,
    spies: {
      header,
      json,
      get,
    },
  };
};

const createUser = (): UserDto => ({
  id: 42,
  email: 'coordinator@example.com',
  isDeleted: 0,
  createdAt: '2024-02-20T12:00:00.000Z',
  roles: ['Coordinator'],
  rangeRoles: {},
});

describe('CreateReservation endpoint contract', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('creates a direct reservation, sets Location header, and returns 201', async () => {
    const createReservationEndpoint = new CreateReservation();
    const user = createUser();
    const reservation: CreatedReservationDto = {
      id: 123,
      range_id: 17,
      coordinator_id: user.id,
    };
    const reservationsService = {
      createReservation: vi.fn().mockResolvedValue(Result.ok(reservation)),
    };
    const request = {
      params: { rangeSlug: 'central-range' },
      query: {},
      body: {
        eventDate: '2024-07-15',
        startTime: '09:00',
        endTime: '10:00',
        numParticipants: 6,
        tracksRequested: 3,
        isPublic: true,
        isJoinable: false,
      },
    };

    const { ctx, spies } = createContext({ reservationsService, user });

    const getValidatedDataSpy = vi
      .spyOn(createReservationEndpoint, 'getValidatedData')
      .mockResolvedValue(request);

    const response = await createReservationEndpoint.handle(ctx as never);

    expect(getValidatedDataSpy).toHaveBeenCalledOnce();
    expect(spies.get).toHaveBeenCalledWith('reservationsService');
    expect(spies.get).toHaveBeenCalledWith('user');
    expect(reservationsService.createReservation).toHaveBeenCalledWith(
      'central-range',
      {
        eventDate: '2024-07-15',
        startTime: '09:00',
        endTime: '10:00',
        numParticipants: 6,
        tracksRequested: 3,
        isPublic: true,
        isJoinable: false,
      },
      { force: false },
      user
    );
    expect(spies.header).toHaveBeenCalledWith(
      'Location',
      '/api/v1/ranges/central-range/reservations/123'
    );
    expect(spies.json).toHaveBeenCalledWith(reservation, 201);
    expect(response).toEqual({ payload: reservation, status: 201 });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('creates a reservation from a proposition with force enabled', async () => {
    const createReservationEndpoint = new CreateReservation();
    const user = createUser();
    const reservation: CreatedReservationDto = {
      id: 456,
      range_id: 99,
      coordinator_id: user.id,
    };
    const reservationsService = {
      createReservation: vi.fn().mockResolvedValue(Result.ok(reservation)),
    };
    const request = {
      params: { rangeSlug: 'east-range' },
      query: { force: 'true' as const },
      body: {
        propositionId: 88,
        startTime: '14:00',
        endTime: '15:00',
        tracksRequested: 1,
      },
    };

    const { ctx, spies } = createContext({ reservationsService, user });

    vi.spyOn(createReservationEndpoint, 'getValidatedData').mockResolvedValue(request);

    const response = await createReservationEndpoint.handle(ctx as never);

    expect(reservationsService.createReservation).toHaveBeenCalledWith(
      'east-range',
      {
        propositionId: 88,
        startTime: '14:00',
        endTime: '15:00',
        tracksRequested: 1,
      },
      { force: true },
      user
    );
    expect(spies.header).toHaveBeenCalledWith(
      'Location',
      '/api/v1/ranges/east-range/reservations/456'
    );
    expect(spies.json).toHaveBeenCalledWith(reservation, 201);
    expect(response).toEqual({ payload: reservation, status: 201 });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('returns mapped error response when service fails with a known domain error', async () => {
    const createReservationEndpoint = new CreateReservation();
    const user = createUser();
    const error = new RangeNotFoundError('central-range');
    const reservationsService = {
      createReservation: vi.fn().mockResolvedValue(Result.fail(error)),
    };
    const request = {
      params: { rangeSlug: 'central-range' },
      query: {},
      body: {
        eventDate: '2024-07-15',
        startTime: '09:00',
        endTime: '10:00',
        numParticipants: 6,
        tracksRequested: 3,
        isPublic: true,
        isJoinable: false,
      },
    };

    const { ctx, spies } = createContext({ reservationsService, user });

    vi.spyOn(createReservationEndpoint, 'getValidatedData').mockResolvedValue(request);

    const response = await createReservationEndpoint.handle(ctx as never);

    expect(reservationsService.createReservation).toHaveBeenCalledWith(
      'central-range',
      {
        eventDate: '2024-07-15',
        startTime: '09:00',
        endTime: '10:00',
        numParticipants: 6,
        tracksRequested: 3,
        isPublic: true,
        isJoinable: false,
      },
      { force: false },
      user
    );
    expect(spies.header).not.toHaveBeenCalled();
    expect(spies.json).toHaveBeenCalledWith(
      { code: 'range_not_found', message: error.message },
      404
    );
    expect(response).toEqual({
      payload: { code: 'range_not_found', message: error.message },
      status: 404,
    });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('logs unexpected failures and returns a 500 response for unknown errors', async () => {
    const createReservationEndpoint = new CreateReservation();
    const user = createUser();
    const unexpectedError = new Error('database offline');
    const reservationsService = {
      createReservation: vi.fn().mockResolvedValue(Result.fail(unexpectedError)),
    };
    const request = {
      params: { rangeSlug: 'central-range' },
      query: {},
      body: {
        eventDate: '2024-07-15',
        startTime: '09:00',
        endTime: '10:00',
        numParticipants: 6,
        tracksRequested: 3,
        isPublic: true,
        isJoinable: false,
      },
    };

    const { ctx, spies } = createContext({ reservationsService, user });

    vi.spyOn(createReservationEndpoint, 'getValidatedData').mockResolvedValue(request);

    const response = await createReservationEndpoint.handle(ctx as never);

    expect(reservationsService.createReservation).toHaveBeenCalledWith(
      'central-range',
      {
        eventDate: '2024-07-15',
        startTime: '09:00',
        endTime: '10:00',
        numParticipants: 6,
        tracksRequested: 3,
        isPublic: true,
        isJoinable: false,
      },
      { force: false },
      user
    );
    expect(spies.header).not.toHaveBeenCalled();
    expect(spies.json).toHaveBeenCalledWith(
      { code: 'internal_error', message: 'Unexpected error occurred' },
      500
    );
    expect(response).toEqual({
      payload: { code: 'internal_error', message: 'Unexpected error occurred' },
      status: 500,
    });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
