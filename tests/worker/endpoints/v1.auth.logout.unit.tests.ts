import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logout } from '../../../src/worker/src/endpoints/v1/auth/logout';

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
  const headerSpy = vi.fn();

  const ctx = {
    json: jsonSpy,
    get: getSpy,
    header: headerSpy,
    req: {raw:{headers: new Headers()}},
  };

  return {
    ctx,
    spies: {
      json: jsonSpy,
      get: getSpy,
      header: headerSpy,
    },
  };
};

describe('Logout endpoint contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a 401 response when the session cookie is missing', async () => {
    const logoutEndpoint = new Logout({
      router: {} as any,
      raiseUnknownParameters: false,
      route: '/logout',
      urlParams: [],
    });
    const { ctx, spies } = createContext();
    // No session cookie set in headers

    const response = await logoutEndpoint.handle(ctx as never);

    expect(spies.get).not.toHaveBeenCalled();
    expect(spies.header).not.toHaveBeenCalled();
    expect(spies.json).toHaveBeenCalledWith({ error: 'Unauthorized' }, 401);
    expect(response).toEqual({ payload: { error: 'Unauthorized' }, status: 401 });
  });

  it('clears the session cookie and returns a 200 response when logout succeeds', async () => {
    const logoutEndpoint = new Logout({
      router: {} as any,
      raiseUnknownParameters: false,
      route: '/logout',
      urlParams: [],
    });
    const token = 'session-token';
    const logout = vi.fn().mockResolvedValue(undefined);
    const { ctx, spies } = createContext({
      dependencies: {
        authService: { logout },
      },
    });
    // Set session cookie in headers
    ctx.req.raw.headers.set('Cookie', `session_token=${token}`);

    const response = await logoutEndpoint.handle(ctx as never);
    
    expect(spies.get).toHaveBeenCalledWith('authService');
    expect(logout).toHaveBeenCalledWith(token);
    expect(spies.header).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('session_token=;'), { append: true });
    expect(spies.json).toHaveBeenCalledWith({ message: 'Logout successful.' }, 200);
    expect(response).toEqual({ payload: { message: 'Logout successful.' }, status: 200 });
  });
});
