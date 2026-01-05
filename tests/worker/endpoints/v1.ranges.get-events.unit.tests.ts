import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetEvents } from '../../../src/worker/src/endpoints/v1/ranges/get-events';
import {
  Result,
  RangeNotFoundError,
  CalendarEventsDto,
  UserDto,
} from '@strzel-sobie/common/models';

type GetEventsDependencies = {
  reservationsService: {
    getCalendarEvents: ReturnType<typeof vi.fn>;
  };
  user: UserDto;
};

const createContext = ({ reservationsService, user }: GetEventsDependencies) => {
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
  id: 44,
  email: 'coordinator@example.com',
  isDeleted: 0,
  createdAt: '2024-03-10T09:15:00.000Z',
  roles: [
    { id: 1, name: 'Member', scope: 'global' },
    { id: 2, name: 'Coordinator', scope: 'range' },
  ],
  rangeRoles: {
    '101': [{ id: 3, name: 'Shooting Range Administrator', scope: 'range' }],
  },
});

describe('GetEvents endpoint contract', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns calendar events when the reservations service succeeds', async () => {
    const getEventsEndpoint = new GetEvents();
    const user = createUser();
    const calendarEvents: CalendarEventsDto = {
      propositions: [
        {
          id: 1,
          userId: user.id,
          isMember: true,
          eventDate: '2024-06-01',
          startTime: '10:00',
          endTime: '11:00',
          tracksRequested: 2,
        },
      ],
      reservations: [
        {
          id: 10,
          eventDate: '2024-06-02',
          startTime: '12:00',
          endTime: '13:00',
          tracksRequested: 1,
          details: {
            coordinatorId: 23,
          },
        },
      ],
      events: [],
      records: [],
    };
    const reservationsService = {
      getCalendarEvents: vi.fn().mockResolvedValue(Result.ok(calendarEvents)),
    };
    const request = {
      params: { rangeSlug: 'urban-range' },
      query: { startDate: '2024-06-01', endDate: '2024-06-30' },
    };

    const { ctx, spies } = createContext({ reservationsService, user });

    const getValidatedDataSpy = vi
      .spyOn(getEventsEndpoint, 'getValidatedData')
      .mockResolvedValue(request);

    const response = await getEventsEndpoint.handle(ctx as never);

    expect(getValidatedDataSpy).toHaveBeenCalledOnce();
    expect(spies.get).toHaveBeenCalledWith('reservationsService');
    expect(spies.get).toHaveBeenCalledWith('user');
    expect(reservationsService.getCalendarEvents).toHaveBeenCalledWith({
      rangeSlug: 'urban-range',
      startDate: '2024-06-01',
      endDate: '2024-06-30',
      user: {
        id: user.id.toString(),
        roles: user.roles.map((role) => role.name),
        range_roles: {
          '101': ['Shooting Range Administrator'],
        },
      },
    });
    expect(spies.json).toHaveBeenCalledWith(calendarEvents);
    expect(response).toEqual({ payload: calendarEvents, status: undefined });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('returns the mapped error response when the reservations service fails with a known domain error', async () => {
    const getEventsEndpoint = new GetEvents();
    const user = createUser();
    const error = new RangeNotFoundError('urban-range');
    const reservationsService = {
      getCalendarEvents: vi.fn().mockResolvedValue(Result.fail<CalendarEventsDto>(error)),
    };
    const request = {
      params: { rangeSlug: 'urban-range' },
      query: { startDate: '2024-06-01', endDate: '2024-06-30' },
    };

    const { ctx, spies } = createContext({ reservationsService, user });

    vi.spyOn(getEventsEndpoint, 'getValidatedData').mockResolvedValue(request);

    const response = await getEventsEndpoint.handle(ctx as never);

    expect(reservationsService.getCalendarEvents).toHaveBeenCalledWith({
      rangeSlug: 'urban-range',
      startDate: '2024-06-01',
      endDate: '2024-06-30',
      user: {
        id: user.id.toString(),
        roles: user.roles.map((role) => role.name),
        range_roles: {
          '101': ['Shooting Range Administrator'],
        },
      },
    });
    expect(spies.json).toHaveBeenCalledWith(
      { code: 'range_not_found', message: error.message },
      404,
    );
    expect(response).toEqual({
      payload: { code: 'range_not_found', message: error.message },
      status: 404,
    });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error while fetching range events', error);
  });

  it('logs unexpected failures and returns a 500 response for unknown errors', async () => {
    const getEventsEndpoint = new GetEvents();
    const user = createUser();
    const unexpectedError = new Error('database offline');
    const reservationsService = {
      getCalendarEvents: vi.fn().mockResolvedValue(Result.fail<CalendarEventsDto>(unexpectedError)),
    };
    const request = {
      params: { rangeSlug: 'urban-range' },
      query: { startDate: '2024-06-01', endDate: '2024-06-30' },
    };

    const { ctx, spies } = createContext({ reservationsService, user });

    vi.spyOn(getEventsEndpoint, 'getValidatedData').mockResolvedValue(request);

    const response = await getEventsEndpoint.handle(ctx as never);

    expect(reservationsService.getCalendarEvents).toHaveBeenCalledWith({
      rangeSlug: 'urban-range',
      startDate: '2024-06-01',
      endDate: '2024-06-30',
      user: {
        id: user.id.toString(),
        roles: user.roles.map((role) => role.name),
        range_roles: {
          '101': ['Shooting Range Administrator'],
        },
      },
    });
    expect(spies.json).toHaveBeenCalledWith(
      { code: 'internal_error', message: 'Unexpected error occurred' },
      500,
    );
    expect(response).toEqual({
      payload: { code: 'internal_error', message: 'Unexpected error occurred' },
      status: 500,
    });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error while fetching range events', unexpectedError);
  });
});
