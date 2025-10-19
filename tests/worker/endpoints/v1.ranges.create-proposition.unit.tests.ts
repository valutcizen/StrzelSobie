import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateProposition } from '../../../src/worker/src/endpoints/v1/ranges/create-proposition';
import {
  RangeNotFoundError,
  Result,
  type CreatedPropositionDto,
  type UserDto,
} from '@strzel-sobie/common';

type CreatePropositionDependencies = {
  reservationsService: {
    createProposition: ReturnType<typeof vi.fn>;
  };
  user: UserDto;
};

const createContext = ({ reservationsService, user }: CreatePropositionDependencies) => {
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
  id: 11,
  email: 'member@example.com',
  isDeleted: 0,
  createdAt: '2024-01-15T12:00:00.000Z',
  roles: ['Member'],
  rangeRoles: {},
});

describe('CreateProposition endpoint contract', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns a 201 response with the created proposition and sets the Location header', async () => {
    const createPropositionEndpoint = new CreateProposition();
    const user = createUser();
    const proposition: CreatedPropositionDto = {
      id: 321,
      user_id: user.id,
      range_id: 77,
      status: 'pending',
    };
    const reservationsService = {
      createProposition: vi.fn().mockResolvedValue(Result.ok(proposition)),
    };
    const request = {
      params: { rangeSlug: 'central-range' },
      body: {
        eventDate: '2024-06-01',
        startTime: '10:00',
        endTime: '11:00',
        numParticipants: 4,
        tracksRequested: 2,
      },
    };

    const { ctx, spies } = createContext({ reservationsService, user });

    const getValidatedDataSpy = vi
      .spyOn(createPropositionEndpoint, 'getValidatedData')
      .mockResolvedValue(request);

    const response = await createPropositionEndpoint.handle(ctx as never);

    expect(getValidatedDataSpy).toHaveBeenCalledOnce();
    expect(spies.get).toHaveBeenCalledWith('reservationsService');
    expect(spies.get).toHaveBeenCalledWith('user');
    expect(reservationsService.createProposition).toHaveBeenCalledWith(
      'central-range',
      {
        eventDate: '2024-06-01',
        startTime: '10:00',
        endTime: '11:00',
        numParticipants: 4,
        tracksRequested: 2,
      },
      user
    );
    expect(spies.header).toHaveBeenCalledWith(
      'Location',
      '/api/v1/ranges/central-range/propositions/321'
    );
    expect(spies.json).toHaveBeenCalledWith(proposition, 201);
    expect(response).toEqual({ payload: proposition, status: 201 });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('returns the mapped error response when creation fails with a known domain error', async () => {
    const createPropositionEndpoint = new CreateProposition();
    const user = createUser();
    const error = new RangeNotFoundError('central-range');
    const reservationsService = {
      createProposition: vi.fn().mockResolvedValue(Result.fail(error)),
    };
    const request = {
      params: { rangeSlug: 'central-range' },
      body: {
        eventDate: '2024-06-01',
        startTime: '10:00',
        endTime: '11:00',
        numParticipants: 4,
        tracksRequested: 2,
      },
    };

    const { ctx, spies } = createContext({ reservationsService, user });

    vi.spyOn(createPropositionEndpoint, 'getValidatedData').mockResolvedValue(request);

    const response = await createPropositionEndpoint.handle(ctx as never);

    expect(reservationsService.createProposition).toHaveBeenCalledWith(
      'central-range',
      {
        eventDate: '2024-06-01',
        startTime: '10:00',
        endTime: '11:00',
        numParticipants: 4,
        tracksRequested: 2,
      },
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
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(error);
  });

  it('logs unexpected failures and returns a 500 response for unknown errors', async () => {
    const createPropositionEndpoint = new CreateProposition();
    const user = createUser();
    const unexpectedError = new Error('database offline');
    const reservationsService = {
      createProposition: vi.fn().mockResolvedValue(Result.fail(unexpectedError)),
    };
    const request = {
      params: { rangeSlug: 'central-range' },
      body: {
        eventDate: '2024-06-01',
        startTime: '10:00',
        endTime: '11:00',
        numParticipants: 4,
        tracksRequested: 2,
      },
    };

    const { ctx, spies } = createContext({ reservationsService, user });

    vi.spyOn(createPropositionEndpoint, 'getValidatedData').mockResolvedValue(request);

    const response = await createPropositionEndpoint.handle(ctx as never);

    expect(reservationsService.createProposition).toHaveBeenCalledWith(
      'central-range',
      {
        eventDate: '2024-06-01',
        startTime: '10:00',
        endTime: '11:00',
        numParticipants: 4,
        tracksRequested: 2,
      },
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
    expect(consoleErrorSpy).toHaveBeenCalledWith(unexpectedError);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Unexpected error during proposition creation',
      unexpectedError
    );
  });
});
