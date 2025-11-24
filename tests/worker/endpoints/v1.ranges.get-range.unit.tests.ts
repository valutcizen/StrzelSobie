import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetRange } from '../../../src/worker/src/endpoints/v1/ranges/get-range';
import {
  RangeNotFoundError,
  Result,
  type MeDto,
  type Role,
  type SessionData,
} from '@strzel-sobie/common/models';
import { getCookie } from 'hono/cookie';

vi.mock('hono/cookie', async () => {
  const actual = await vi.importActual<typeof import('hono/cookie')>('hono/cookie');
  return {
    ...actual,
    getCookie: vi.fn(),
  };
});

type ServiceMocks = {
  rangesService: {
    getRangeDetails: ReturnType<typeof vi.fn>;
  };
  authService: {
    validateSession: ReturnType<typeof vi.fn<[string], Promise<Result<SessionData>>>>;
  };
  userService: {
    getFullUserProfile: ReturnType<typeof vi.fn<[number], Promise<Result<MeDto>>>>;
    getRoles: ReturnType<typeof vi.fn<[], Promise<Result<Role[]>>>>;
  };
};

const createServices = (): ServiceMocks => ({
  rangesService: {
    getRangeDetails: vi.fn(),
  },
  authService: {
    validateSession: vi.fn(),
  },
  userService: {
    getFullUserProfile: vi.fn(),
    getRoles: vi.fn(),
  },
});

const createContext = (services: ServiceMocks = createServices()) => {
  const json = vi.fn((payload: unknown, status?: number) => ({ payload, status }));
  const get = vi.fn((key: string) => {
    if (key === 'rangesService') {
      return services.rangesService;
    }
    if (key === 'authService') {
      return services.authService;
    }
    if (key === 'userService') {
      return services.userService;
    }
    return undefined;
  });

  const ctx = {
    json,
    get,
  };

  return {
    ctx,
    spies: { json, get },
    services,
  };
};

describe('GetRange endpoint contract', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let getCookieMock: vi.MockedFunction<typeof getCookie>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    getCookieMock = vi.mocked(getCookie);
    getCookieMock.mockReturnValue(undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    getCookieMock.mockReset();
  });

  it('returns range details without session context', async () => {
    const endpoint = new GetRange();
    const { ctx, spies, services } = createContext();
    const rangeDetails = {
      id: 3,
      slug: 'central-range',
      displayName: 'Central Range',
      allowsReservations: true,
    };

    const getValidatedDataSpy = vi
      .spyOn(endpoint, 'getValidatedData')
      .mockResolvedValue({ params: { rangeSlug: 'central-range' } });
    services.rangesService.getRangeDetails.mockResolvedValue(Result.ok(rangeDetails));

    const response = await endpoint.handle(ctx as never);

    expect(getValidatedDataSpy).toHaveBeenCalledOnce();
    expect(getCookieMock).toHaveBeenCalledWith(ctx as never, 'session_token');
    expect(services.authService.validateSession).not.toHaveBeenCalled();
    expect(services.userService.getFullUserProfile).not.toHaveBeenCalled();
    expect(services.userService.getRoles).not.toHaveBeenCalled();
    expect(services.rangesService.getRangeDetails).toHaveBeenCalledWith('central-range');
    expect(spies.json).toHaveBeenCalledWith(rangeDetails, 200);
    expect(response).toEqual({ payload: rangeDetails, status: 200 });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('constructs an authenticated user payload when a valid session exists', async () => {
    vi.useFakeTimers();
    const now = new Date('2024-06-01T12:00:00.000Z');
    vi.setSystemTime(now);

    try {
      const endpoint = new GetRange();
      const { ctx, spies, services } = createContext();
      const session: SessionData = {
        userId: 50,
        email: 'member@example.com',
        phoneNumber: null,
        roles: ['Member'],
        rangeRoles: { '77': ['Range Officer'] },
      };
      const profile: MeDto = {
        id: session.userId,
        email: session.email,
        phoneNumber: session.phoneNumber,
        roles: ['Member', 'Unknown Role'],
        rangeRoles: { '77': ['Range Officer', 'Missing Role'] },
      };
      const memberRole: Role = { id: 1, name: 'Member', scope: 'global' };
      const officerRole: Role = { id: 2, name: 'Range Officer', scope: 'range' };
      const rangeDetails = {
        id: 10,
        slug: 'forest-hills',
        displayName: 'Forest Hills',
      };

      getCookieMock.mockReturnValue('session-token');
      services.authService.validateSession.mockResolvedValue(Result.ok(session));
      services.userService.getFullUserProfile.mockResolvedValue(Result.ok(profile));
      services.userService.getRoles.mockResolvedValue(Result.ok([memberRole, officerRole]));
      services.rangesService.getRangeDetails.mockResolvedValue(Result.ok(rangeDetails));

      const getValidatedDataSpy = vi
        .spyOn(endpoint, 'getValidatedData')
        .mockResolvedValue({ params: { rangeSlug: 'forest-hills' } });

      const response = await endpoint.handle(ctx as never);

      expect(getValidatedDataSpy).toHaveBeenCalledOnce();
      expect(services.authService.validateSession).toHaveBeenCalledWith('session-token');
      expect(services.userService.getFullUserProfile).toHaveBeenCalledWith(session.userId);
      expect(services.userService.getRoles).toHaveBeenCalledOnce();
      expect(services.rangesService.getRangeDetails).toHaveBeenCalledWith('forest-hills', {
        id: profile.id,
        email: profile.email,
        isDeleted: 0,
        createdAt: now.toISOString(),
        roles: [memberRole],
        rangeRoles: { '77': [officerRole] },
        range_roles: { '77': [officerRole] },
      });
      expect(spies.json).toHaveBeenCalledWith(rangeDetails, 200);
      expect(response).toEqual({ payload: rangeDetails, status: 200 });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('maps missing ranges to a 404 response', async () => {
    const endpoint = new GetRange();
    const { ctx, spies, services } = createContext();
    const error = new RangeNotFoundError('missing-range');

    vi.spyOn(endpoint, 'getValidatedData').mockResolvedValue({ params: { rangeSlug: 'missing-range' } });
    services.rangesService.getRangeDetails.mockResolvedValue(Result.fail(error));

    const response = await endpoint.handle(ctx as never);

    expect(spies.json).toHaveBeenCalledWith({ error: 'missing-range' }, 404);
    expect(response).toEqual({ payload: { error: 'missing-range' }, status: 404 });
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error while fetching range details', error);
  });

  it('returns a 500 response for unexpected failures', async () => {
    const endpoint = new GetRange();
    const { ctx, spies, services } = createContext();
    const error = new Error('database offline');

    vi.spyOn(endpoint, 'getValidatedData').mockResolvedValue({ params: { rangeSlug: 'forest-hills' } });
    services.rangesService.getRangeDetails.mockResolvedValue(Result.fail(error));

    const response = await endpoint.handle(ctx as never);

    expect(spies.json).toHaveBeenCalledWith({ error: 'Failed to fetch range details' }, 500);
    expect(response).toEqual({
      payload: { error: 'Failed to fetch range details' },
      status: 500,
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error while fetching range details', error);
  });
});
