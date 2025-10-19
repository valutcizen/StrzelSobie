import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteProposition } from '../../../src/worker/src/endpoints/v1/propositions/delete-proposition';
import {
  PropositionNotFoundError,
  Result,
  type UserDto,
} from '@strzel-sobie/common';

type DeletePropositionDependencies = {
  reservationsService: {
    cancelProposition: ReturnType<typeof vi.fn>;
  };
  user: UserDto;
};

const createContext = ({ reservationsService, user }: DeletePropositionDependencies) => {
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
  id: 42,
  email: 'member@example.com',
  isDeleted: 0,
  createdAt: '2024-01-10T12:00:00.000Z',
  roles: [],
  rangeRoles: {},
});

describe('DeleteProposition endpoint contract', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns a 204 response when the proposition is cancelled successfully', async () => {
    const deleteEndpoint = new DeleteProposition();
    const user = createUser();
    const reservationsService = {
      cancelProposition: vi.fn().mockResolvedValue(Result.ok<void>(undefined)),
    };

    const { ctx, spies } = createContext({ reservationsService, user });

    const getValidatedDataSpy = vi
      .spyOn(deleteEndpoint, 'getValidatedData')
      .mockResolvedValue({ params: { propositionId: 7 } });

    const response = await deleteEndpoint.handle(ctx as never);

    expect(getValidatedDataSpy).toHaveBeenCalledOnce();
    expect(spies.get).toHaveBeenCalledWith('reservationsService');
    expect(spies.get).toHaveBeenCalledWith('user');
    expect(reservationsService.cancelProposition).toHaveBeenCalledWith(
      { propositionId: 7 },
      user,
    );
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(204);
    expect(spies.json).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('returns the mapped error response when cancellation fails with a domain error', async () => {
    const deleteEndpoint = new DeleteProposition();
    const user = createUser();
    const error = new PropositionNotFoundError();
    const reservationsService = {
      cancelProposition: vi.fn().mockResolvedValue(Result.fail<void>(error)),
    };

    const { ctx, spies } = createContext({ reservationsService, user });

    const getValidatedDataSpy = vi
      .spyOn(deleteEndpoint, 'getValidatedData')
      .mockResolvedValue({ params: { propositionId: 99 } });

    const response = await deleteEndpoint.handle(ctx as never);

    expect(getValidatedDataSpy).toHaveBeenCalledOnce();
    expect(reservationsService.cancelProposition).toHaveBeenCalledWith(
      { propositionId: 99 },
      user,
    );
    expect(spies.json).toHaveBeenCalledWith(
      { code: 'proposition_not_found', message: error.message },
      404,
    );
    expect(response).toEqual({
      payload: { code: 'proposition_not_found', message: error.message },
      status: 404,
    });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(error);
  });

  it('logs unexpected failures and returns a 500 response when cancellation throws an unknown error', async () => {
    const deleteEndpoint = new DeleteProposition();
    const user = createUser();
    const unexpectedError = new Error('database offline');
    const reservationsService = {
      cancelProposition: vi.fn().mockResolvedValue(Result.fail<void>(unexpectedError)),
    };

    const { ctx, spies } = createContext({ reservationsService, user });

    vi.spyOn(deleteEndpoint, 'getValidatedData').mockResolvedValue({
      params: { propositionId: 15 },
    });

    const response = await deleteEndpoint.handle(ctx as never);

    expect(reservationsService.cancelProposition).toHaveBeenCalledWith(
      { propositionId: 15 },
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
    expect(consoleErrorSpy).toHaveBeenCalledWith(unexpectedError);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Unexpected error during proposition cancellation',
      unexpectedError,
    );
  });
});
