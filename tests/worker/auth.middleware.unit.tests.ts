import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Result, type MeDto, type Role, type SessionData, type UserDto } from '@strzel-sobie/common';
import { authMiddleware } from '../../src/worker/src/middleware/auth';
import { getCookie } from 'hono/cookie';

vi.mock('hono/cookie', () => ({
  getCookie: vi.fn(),
}));

const getCookieMock = vi.mocked(getCookie);

type AuthServiceMock = {
  validateSession: ReturnType<typeof vi.fn<[string], Promise<Result<SessionData>>>>;
};

type UserServiceMock = {
  getFullUserProfile: ReturnType<typeof vi.fn<[number], Promise<Result<MeDto>>>>;
  getRoles: ReturnType<typeof vi.fn<[], Promise<Result<Role[]>>>>;
};

const createAuthService = (): AuthServiceMock => ({
  validateSession: vi.fn<[string], Promise<Result<SessionData>>>(),
});

const createUserService = (): UserServiceMock => ({
  getFullUserProfile: vi.fn<[number], Promise<Result<MeDto>>>(),
  getRoles: vi.fn<[], Promise<Result<Role[]>>>(),
});

type TestContextOptions = {
  authService?: AuthServiceMock;
  userService?: UserServiceMock;
};

const createContext = ({ authService = createAuthService(), userService = createUserService() }: TestContextOptions = {}) => {
  const store = new Map<string, unknown>();
  const get = vi.fn((key: string) => {
    if (key === 'authService') {
      return authService;
    }
    if (key === 'userService') {
      return userService;
    }
    return undefined;
  });
  const set = vi.fn((key: string, value: unknown) => {
    store.set(key, value);
  });
  const json = vi.fn((payload: unknown, status?: number) => ({ payload, status }));

  const ctx = {
    get,
    set,
    json,
  };

  return {
    ctx,
    store,
    spies: { get, set, json },
    authService,
    userService,
  };
};

describe('authMiddleware contract', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    getCookieMock.mockReset();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns 401 when no session token cookie is present', async () => {
    const { ctx, spies, authService, userService } = createContext();
    const next = vi.fn();
    getCookieMock.mockReturnValue(undefined);

    const response = await authMiddleware(ctx as never, next);

    expect(getCookieMock).toHaveBeenCalledWith(ctx, 'session_token');
    expect(spies.get).toHaveBeenCalledWith('authService');
    expect(spies.json).toHaveBeenCalledWith({ message: 'Unauthorized' }, 401);
    expect(response).toEqual({ payload: { message: 'Unauthorized' }, status: 401 });
    expect(authService.validateSession).not.toHaveBeenCalled();
    expect(userService.getFullUserProfile).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when the session token fails validation', async () => {
    const { ctx, spies, authService, userService } = createContext();
    const next = vi.fn();
    const validationError = new Error('invalid session');
    getCookieMock.mockReturnValue('token-abc');
    authService.validateSession.mockResolvedValue(Result.fail(validationError));

    const response = await authMiddleware(ctx as never, next);

    expect(getCookieMock).toHaveBeenCalledWith(ctx, 'session_token');
    expect(authService.validateSession).toHaveBeenCalledWith('token-abc');
    expect(spies.json).toHaveBeenCalledWith({ message: 'Unauthorized' }, 401);
    expect(response).toEqual({ payload: { message: 'Unauthorized' }, status: 401 });
    expect(userService.getFullUserProfile).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when fetching the user profile fails', async () => {
    const { ctx, spies, authService, userService } = createContext();
    const next = vi.fn();
    const session: SessionData = {
      userId: 42,
      email: 'user@example.com',
      phoneNumber: '+48123456789',
      roles: ['Member'],
      rangeRoles: {},
    };
    getCookieMock.mockReturnValue('token-xyz');
    authService.validateSession.mockResolvedValue(Result.ok(session));
    userService.getFullUserProfile.mockResolvedValue(Result.fail(new Error('profile lookup failed')));

    const response = await authMiddleware(ctx as never, next);

    expect(authService.validateSession).toHaveBeenCalledWith('token-xyz');
    expect(userService.getFullUserProfile).toHaveBeenCalledWith(session.userId);
    expect(spies.json).toHaveBeenCalledWith({ message: 'Unauthorized' }, 401);
    expect(response).toEqual({ payload: { message: 'Unauthorized' }, status: 401 });
    expect(userService.getRoles).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 500 when loading roles fails', async () => {
    const { ctx, spies, authService, userService, store } = createContext();
    const next = vi.fn();
    const session: SessionData = {
      userId: 7,
      email: 'user@example.com',
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
    getCookieMock.mockReturnValue('token-roles');
    authService.validateSession.mockResolvedValue(Result.ok(session));
    userService.getFullUserProfile.mockResolvedValue(Result.ok(profile));
    userService.getRoles.mockResolvedValue(Result.fail(new Error('roles error')));

    const response = await authMiddleware(ctx as never, next);

    expect(authService.validateSession).toHaveBeenCalledWith('token-roles');
    expect(userService.getFullUserProfile).toHaveBeenCalledWith(session.userId);
    expect(userService.getRoles).toHaveBeenCalledOnce();
    expect(store.get('session')).toEqual(session);
    expect(store.has('user')).toBe(false);
    expect(spies.json).toHaveBeenCalledWith({ message: 'Internal server error' }, 500);
    expect(response).toEqual({ payload: { message: 'Internal server error' }, status: 500 });
    expect(next).not.toHaveBeenCalled();
  });

  it('stores the authenticated session and user then calls the next handler when validation passes', async () => {
    vi.useFakeTimers();
    const fixedDate = new Date('2024-01-01T12:00:00.000Z');
    vi.setSystemTime(fixedDate);

    try {
      const { ctx, spies, authService, userService, store } = createContext();
      const session: SessionData = {
        userId: 99,
        email: 'member@example.com',
        phoneNumber: null,
        roles: ['Member'],
        rangeRoles: {
          '21': ['Range Officer', 'Unknown Range Role'],
        },
      };
      const profile: MeDto = {
        id: session.userId,
        email: session.email,
        phoneNumber: session.phoneNumber,
        roles: ['Member', 'Shadow Role'],
        rangeRoles: session.rangeRoles,
      };
      const memberRole: Role = { id: 1, name: 'Member', scope: 'global' };
      const rangeOfficerRole: Role = { id: 2, name: 'Range Officer', scope: 'range' };
      const extraRole: Role = { id: 3, name: 'Spectator', scope: 'global' };

      getCookieMock.mockReturnValue('token-valid');
      authService.validateSession.mockResolvedValue(Result.ok(session));
      userService.getFullUserProfile.mockResolvedValue(Result.ok(profile));
      userService.getRoles.mockResolvedValue(Result.ok([memberRole, rangeOfficerRole, extraRole]));

      const nextResult = { ok: true };
      const next = vi.fn().mockResolvedValue(nextResult);

      const response = await authMiddleware(ctx as never, next);

      expect(authService.validateSession).toHaveBeenCalledWith('token-valid');
      expect(userService.getFullUserProfile).toHaveBeenCalledWith(session.userId);
      expect(userService.getRoles).toHaveBeenCalledOnce();
      expect(spies.set).toHaveBeenNthCalledWith(1, 'session', session);

      const storedUser = store.get('user') as (UserDto & { range_roles: Record<string, Role[]> }) | undefined;

      expect(storedUser).toBeDefined();
      expect(storedUser?.id).toBe(profile.id);
      expect(storedUser?.email).toBe(profile.email);
      expect(storedUser?.isDeleted).toBe(0);
      expect(storedUser?.createdAt).toBe(fixedDate.toISOString());
      expect(storedUser?.roles).toEqual([memberRole]);
      expect(storedUser?.rangeRoles).toEqual({ '21': [rangeOfficerRole] });
      expect(storedUser?.range_roles).toEqual({ '21': [rangeOfficerRole] });

      expect(spies.set).toHaveBeenNthCalledWith(2, 'user', storedUser);
      expect(spies.get).toHaveBeenNthCalledWith(1, 'authService');
      expect(spies.get).toHaveBeenNthCalledWith(2, 'userService');
      expect(spies.json).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledOnce();
      expect(next.mock.results[0]?.value).toEqual(nextResult);
      expect(response).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});
