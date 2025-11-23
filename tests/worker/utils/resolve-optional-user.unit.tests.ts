import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveOptionalUser } from '../../../src/worker/src/utils/resolve-optional-user';
import {
  Result,
  type MeDto,
  type Role,
  type SessionData,
  type UserDto,
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
  authService: {
    validateSession: ReturnType<typeof vi.fn<[string], Promise<Result<SessionData>>>>;
  };
  userService: {
    getFullUserProfile: ReturnType<typeof vi.fn<[number], Promise<Result<MeDto>>>>;
    getRoles: ReturnType<typeof vi.fn<[], Promise<Result<Role[]>>>>;
  };
};

const createServices = (): ServiceMocks => ({
  authService: {
    validateSession: vi.fn(),
  },
  userService: {
    getFullUserProfile: vi.fn(),
    getRoles: vi.fn(),
  },
});

const createContext = (services: ServiceMocks = createServices()) => {
  const get = vi.fn((key: string) => {
    if (key === 'authService') {
      return services.authService;
    }
    if (key === 'userService') {
      return services.userService;
    }
    return undefined;
  });

  const ctx = {
    get,
    req: {
      header: vi.fn(),
    },
  };

  return { ctx, spies: { get }, services };
};

const anonymousUser: UserDto = {
  id: -1,
  email: 'anonymous@strzel-sobie.local',
  isDeleted: 0,
  createdAt: new Date(0).toISOString(),
  roles: [],
  rangeRoles: {},
};

describe('resolveOptionalUser', () => {
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

  it('returns an anonymous user when no session cookie is present', async () => {
    const { ctx } = createContext();

    const result = await resolveOptionalUser(ctx as never);

    expect(getCookieMock).toHaveBeenCalledWith(ctx as never, 'session_token');
    expect(result).toEqual(anonymousUser);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('constructs a normalized user when the session and profile are valid', async () => {
    const { ctx, services } = createContext();
    const session: SessionData = {
      userId: 5,
      email: 'member@example.com',
      phoneNumber: null,
      roles: ['Member'],
      rangeRoles: { '11': ['Range Officer'] },
    };
    const profile: MeDto = {
      id: session.userId,
      email: session.email,
      phoneNumber: session.phoneNumber,
      roles: ['Member', 'Ghost Role'],
      rangeRoles: { '11': ['Range Officer', 'Missing'] },
      isDeleted: 0,
      createdAt: '2024-04-01T10:00:00.000Z',
    };
    const memberRole: Role = { id: 1, name: 'Member', scope: 'global' };
    const officerRole: Role = { id: 2, name: 'Range Officer', scope: 'range' };

    getCookieMock.mockReturnValue('valid-token');
    services.authService.validateSession.mockResolvedValue(Result.ok(session));
    services.userService.getFullUserProfile.mockResolvedValue(Result.ok(profile));
    services.userService.getRoles.mockResolvedValue(Result.ok([memberRole, officerRole]));

    const result = await resolveOptionalUser(ctx as never);

    expect(services.authService.validateSession).toHaveBeenCalledWith('valid-token');
    expect(services.userService.getFullUserProfile).toHaveBeenCalledWith(session.userId);
    expect(services.userService.getRoles).toHaveBeenCalledOnce();
    expect(result).toEqual({
      id: profile.id,
      email: profile.email,
      isDeleted: 0,
      createdAt: profile.createdAt,
      roles: [memberRole],
      rangeRoles: { '11': [officerRole] },
    });
  });

  it('falls back to anonymous when session validation fails', async () => {
    const { ctx, services } = createContext();
    getCookieMock.mockReturnValue('bad-token');
    services.authService.validateSession.mockResolvedValue(Result.fail(new Error('invalid session')));

    const result = await resolveOptionalUser(ctx as never);

    expect(result).toEqual(anonymousUser);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('logs and returns anonymous when role loading fails', async () => {
    const { ctx, services } = createContext();
    const session: SessionData = {
      userId: 7,
      email: 'member@example.com',
      phoneNumber: null,
      roles: ['Member'],
      rangeRoles: {},
    };
    const profile: MeDto = {
      id: session.userId,
      email: session.email,
      phoneNumber: session.phoneNumber,
      roles: ['Member'],
      rangeRoles: {},
    };
    const rolesError = new Error('roles unavailable');

    getCookieMock.mockReturnValue('valid-token');
    services.authService.validateSession.mockResolvedValue(Result.ok(session));
    services.userService.getFullUserProfile.mockResolvedValue(Result.ok(profile));
    services.userService.getRoles.mockResolvedValue(Result.fail(rolesError));

    const result = await resolveOptionalUser(ctx as never);

    expect(result).toEqual(anonymousUser);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to resolve optional user', rolesError);
  });
});
