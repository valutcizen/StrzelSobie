import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PropositionNotFoundError,
  Result,
  type PropositionDetailDto,
  type UserDto,
} from '@strzel-sobie/common';
import { GetPropositionDetail } from '../../../../../src/worker/src/endpoints/v1/propositions/get-proposition';

type GetPropositionDetailDependencies = {
  reservationsService: {
    getPropositionDetails: ReturnType<typeof vi.fn>;
  };
  user: UserDto;
};

const createContext = ({ reservationsService, user }: GetPropositionDetailDependencies) => {
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
  id: 11,
  email: 'member@example.com',
  isDeleted: 0,
  createdAt: '2024-01-15T12:00:00.000Z',
  roles: ['Member'],
  rangeRoles: {},
});

describe('GetPropositionDetail endpoint contract', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns a 200 response with proposition details on success', async () => {
    const getPropositionDetailEndpoint = new GetPropositionDetail();
    const user = createUser();
    const propositionDetail: PropositionDetailDto = {
      id: 123,
      status: 'accepted',
      eventDate: '2024-10-10',
    } as PropositionDetailDto;

    const reservationsService = {
      getPropositionDetails: vi.fn().mockResolvedValue(Result.ok(propositionDetail)),
    };
    const request = {
      params: { propositionId: 123 },
    };

    const { ctx, spies } = createContext({ reservationsService, user });

    const getValidatedDataSpy = vi
      .spyOn(getPropositionDetailEndpoint, 'getValidatedData')
      .mockResolvedValue(request);

    const response = await getPropositionDetailEndpoint.handle(ctx as never);

    expect(getValidatedDataSpy).toHaveBeenCalledOnce();
    expect(spies.get).toHaveBeenCalledWith('reservationsService');
    expect(spies.get).toHaveBeenCalledWith('user');
    expect(reservationsService.getPropositionDetails).toHaveBeenCalledWith(123, user);
    expect(spies.json).toHaveBeenCalledWith(propositionDetail, 200);
    expect(response).toEqual({ payload: propositionDetail, status: 200 });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('returns a mapped error for a known domain error', async () => {
    const getPropositionDetailEndpoint = new GetPropositionDetail();
    const user = createUser();
    const error = new PropositionNotFoundError('not found');
    const reservationsService = {
      getPropositionDetails: vi.fn().mockResolvedValue(Result.fail(error)),
    };
    const request = {
      params: { propositionId: 123 },
    };

    const { ctx, spies } = createContext({ reservationsService, user });

    vi.spyOn(getPropositionDetailEndpoint, 'getValidatedData').mockResolvedValue(request);

    const response = await getPropositionDetailEndpoint.handle(ctx as never);

    expect(reservationsService.getPropositionDetails).toHaveBeenCalledWith(123, user);
    expect(spies.json).toHaveBeenCalledWith(
      { code: 'proposition_not_found', message: 'not found' },
      404
    );
    expect(response).toEqual({
      payload: { code: 'proposition_not_found', message: 'not found' },
      status: 404,
    });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('returns a 500 error for an unknown error', async () => {
    const getPropositionDetailEndpoint = new GetPropositionDetail();
    const user = createUser();
    const error = new Error('database is down');
    const reservationsService = {
      getPropositionDetails: vi.fn().mockResolvedValue(Result.fail(error)),
    };
    const request = {
      params: { propositionId: 123 },
    };

    const { ctx, spies } = createContext({ reservationsService, user });

    vi.spyOn(getPropositionDetailEndpoint, 'getValidatedData').mockResolvedValue(request);

    const response = await getPropositionDetailEndpoint.handle(ctx as never);

    expect(reservationsService.getPropositionDetails).toHaveBeenCalledWith(123, user);
    expect(spies.json).toHaveBeenCalledWith(
      { code: 'internal_error', message: 'Unexpected error occurred' },
      500
    );
    expect(response).toEqual({
      payload: { code: 'internal_error', message: 'Unexpected error occurred' },
      status: 500,
    });
    expect(consoleErrorSpy).not.toHaveBeenCalled(); // mapReservationsError does not log
  });
});
