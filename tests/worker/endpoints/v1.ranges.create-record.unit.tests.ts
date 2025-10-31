import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateRecord } from '../../../src/worker/src/endpoints/v1/ranges/create-record';
import {
  Result,
  InvalidTimeRangeError,
  NoAvailableSpotsError,
  ReservationInPastError,
  UserDoesNotHavePermissionError,
  CreateRecordCommand,
  CreatedRecordDto,
  RangeNotFoundError,
  UserDto,
} from '@strzel-sobie/common/models';

type CreateRecordDependencies = {
  reservationsService: {
    createRecord: ReturnType<typeof vi.fn>;
  };
  user: UserDto;
};

const createContext = ({ reservationsService, user }: CreateRecordDependencies) => {
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
  id: 21,
  email: 'admin@example.com',
  isDeleted: 0,
  createdAt: '2024-02-01T10:00:00.000Z',
  roles: ['Admin'],
  rangeRoles: {},
});

describe('CreateRecord endpoint contract', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns a 201 response with the created record and sets the Location header', async () => {
    const createRecordEndpoint = new CreateRecord();
    const user = createUser();
    const record: CreatedRecordDto = {
      id: 915,
      rangeId: 42,
      adminId: user.id,
      eventDate: '2024-07-04',
      startTime: '09:00',
      endTime: '10:00',
      numParticipants: 6,
      createdAt: '2024-07-04T08:30:00.000Z',
    };
    const reservationsService = {
      createRecord: vi.fn().mockResolvedValue(Result.ok(record)),
    };
    const request = {
      params: { rangeSlug: 'downtown-range' },
      body: {
        eventDate: '2024-07-04',
        startTime: '09:00',
        endTime: '10:00',
        numParticipants: 6,
      },
    };

    const { ctx, spies } = createContext({ reservationsService, user });

    const getValidatedDataSpy = vi
      .spyOn(createRecordEndpoint, 'getValidatedData')
      .mockResolvedValue(request);

    const response = await createRecordEndpoint.handle(ctx as never);

    expect(getValidatedDataSpy).toHaveBeenCalledOnce();
    expect(spies.get).toHaveBeenCalledWith('reservationsService');
    expect(spies.get).toHaveBeenCalledWith('user');
    expect(reservationsService.createRecord).toHaveBeenCalledWith(
      'downtown-range',
      {
        eventDate: '2024-07-04',
        startTime: '09:00',
        endTime: '10:00',
        numParticipants: 6,
      },
      user,
    );
    expect(spies.header).toHaveBeenCalledWith(
      'Location',
      '/api/v1/ranges/downtown-range/records/915',
    );
    expect(spies.json).toHaveBeenCalledWith(record, 201);
    expect(response).toEqual({ payload: record, status: 201 });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('returns the mapped error response when creation fails with a known domain error', async () => {
    const createRecordEndpoint = new CreateRecord();
    const user = createUser();
    const error = new RangeNotFoundError('Range downtown-range not found');
    const reservationsService = {
      createRecord: vi.fn().mockResolvedValue(Result.fail<CreatedRecordDto>(error)),
    };
    const request = {
      params: { rangeSlug: 'downtown-range' },
      body: {
        eventDate: '2024-07-04',
        startTime: '09:00',
        endTime: '10:00',
        numParticipants: 6,
      },
    };

    const { ctx, spies } = createContext({ reservationsService, user });

    vi.spyOn(createRecordEndpoint, 'getValidatedData').mockResolvedValue(request);

    const response = await createRecordEndpoint.handle(ctx as never);

    expect(reservationsService.createRecord).toHaveBeenCalledWith(
      'downtown-range',
      {
        eventDate: '2024-07-04',
        startTime: '09:00',
        endTime: '10:00',
        numParticipants: 6,
      },
      user,
    );
    expect(spies.header).not.toHaveBeenCalled();
    expect(spies.json).toHaveBeenCalledWith(
      { code: 'range_not_found', message: error.message },
      404,
    );
    expect(response).toEqual({
      payload: { code: 'range_not_found', message: error.message },
      status: 404,
    });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error during record creation', error);
  });

  it('logs unexpected failures and returns a 500 response for unknown errors', async () => {
    const createRecordEndpoint = new CreateRecord();
    const user = createUser();
    const unexpectedError = new Error('database offline');
    const reservationsService = {
      createRecord: vi.fn().mockResolvedValue(Result.fail<CreatedRecordDto>(unexpectedError)),
    };
    const request = {
      params: { rangeSlug: 'downtown-range' },
      body: {
        eventDate: '2024-07-04',
        startTime: '09:00',
        endTime: '10:00',
        numParticipants: 6,
      },
    };

    const { ctx, spies } = createContext({ reservationsService, user });

    vi.spyOn(createRecordEndpoint, 'getValidatedData').mockResolvedValue(request);

    const response = await createRecordEndpoint.handle(ctx as never);

    expect(reservationsService.createRecord).toHaveBeenCalledWith(
      'downtown-range',
      {
        eventDate: '2024-07-04',
        startTime: '09:00',
        endTime: '10:00',
        numParticipants: 6,
      },
      user,
    );
    expect(spies.header).not.toHaveBeenCalled();
    expect(spies.json).toHaveBeenCalledWith(
      { code: 'internal_error', message: 'Unexpected error occurred' },
      500,
    );
    expect(response).toEqual({
      payload: { code: 'internal_error', message: 'Unexpected error occurred' },
      status: 500,
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error during record creation', unexpectedError);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error during record creation',
      unexpectedError,
    );
  });
});
