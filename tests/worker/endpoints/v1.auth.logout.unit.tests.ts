import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logout } from '../../../src/worker/src/endpoints/v1/auth/logout';
import { getCookie, setCookie } from 'hono/cookie';

vi.mock('hono/cookie', () => ({
  getCookie: vi.fn(),
  setCookie: vi.fn(),
}));

const getCookieMock = vi.mocked(getCookie);
const setCookieMock = vi.mocked(setCookie);

type LogoutDependencies = {
  authService: {
    logout: ReturnType<typeof vi.fn>;
  };
};

type TestContextOptions = {
  dependencies?: LogoutDependencies;
};

const createContext = ({ dependencies }: TestContextOptions = {}) => {
  const jsonSpy = vi.fn((payload: unknown, status?: number) => ({ payload, status }));
  const getSpy = vi.fn((key: string) => {
    if (key === 'authService') {
      return dependencies?.authService;
    }
    return undefined;
  });

  const ctx = {
    json: jsonSpy,
    get: getSpy,
  };

  return {
    ctx,
    spies: {
      json: jsonSpy,
      get: getSpy,
    },
  };
};

describe('Logout endpoint contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a 401 response when the session cookie is missing', async () => {
    const logoutEndpoint = new Logout();
    const { ctx, spies } = createContext();
    getCookieMock.mockReturnValueOnce(undefined);

    const response = await logoutEndpoint.handle(ctx as never);

    expect(getCookieMock).toHaveBeenCalledWith(ctx, 'session_token');
    expect(spies.get).not.toHaveBeenCalled();
    expect(setCookieMock).not.toHaveBeenCalled();
    expect(spies.json).toHaveBeenCalledWith({ error: 'Unauthorized' }, 401);
    expect(response).toEqual({ payload: { error: 'Unauthorized' }, status: 401 });
  });

  it('clears the session cookie and returns a 200 response when logout succeeds', async () => {
    const logoutEndpoint = new Logout();
    const token = 'session-token';
    const logout = vi.fn().mockResolvedValue(undefined);
    const { ctx, spies } = createContext({
      dependencies: {
        authService: { logout },
      },
    });
    getCookieMock.mockReturnValueOnce(token);

    const response = await logoutEndpoint.handle(ctx as never);

    expect(getCookieMock).toHaveBeenCalledWith(ctx, 'session_token');
    expect(spies.get).toHaveBeenCalledWith('authService');
    expect(logout).toHaveBeenCalledWith(token);
    expect(setCookieMock).toHaveBeenCalledWith(ctx, 'session_token', '', {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 0,
    });
    expect(spies.json).toHaveBeenCalledWith({ message: 'Logout successful.' }, 200);
    expect(response).toEqual({ payload: { message: 'Logout successful.' }, status: 200 });
  });
});
