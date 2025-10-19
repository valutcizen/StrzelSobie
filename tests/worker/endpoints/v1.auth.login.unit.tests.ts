import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Login } from '../../../src/worker/src/endpoints/v1/auth/login';
import { InvalidCredentialsError, Result } from '@strzel-sobie/common';
import type { LoginUserDto } from '@strzel-sobie/common';

type LoginDependencies = {
  authService: {
    login: ReturnType<typeof vi.fn>;
  };
};

type TestContextOptions = {
  body: unknown;
  dependencies?: LoginDependencies;
};

const createContext = ({ body, dependencies }: TestContextOptions) => {
  const reqJson = vi.fn().mockResolvedValue(body);
  const json = vi.fn((payload: unknown, status?: number) => ({ payload, status }));
  const get = vi.fn((key: string) => {
    if (key === 'authService') {
      return dependencies?.authService;
    }
    return undefined;
  });
  const header = vi.fn();

  const ctx = {
    req: { json: reqJson },
    json,
    get,
    header,
  };

  return {
    ctx,
    spies: {
      reqJson,
      json,
      get,
      header,
    },
  };
};

describe('Login endpoint contract', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns a 400 response when the request body fails validation', async () => {
    const loginEndpoint = new Login();
    const invalidRequest = { email: 'not-an-email', password: '' };

    const { ctx, spies } = createContext({ body: invalidRequest });

    const response = await loginEndpoint.handle(ctx as never);

    expect(spies.reqJson).toHaveBeenCalledOnce();
    expect(spies.get).not.toHaveBeenCalled();
    expect(spies.json).toHaveBeenCalledWith({ message: 'Invalid request body' }, 400);
    expect(response).toEqual({ payload: { message: 'Invalid request body' }, status: 400 });
    expect(spies.header).not.toHaveBeenCalled();
  });

  it('sets the session cookie and returns the session roles when login succeeds', async () => {
    const loginEndpoint = new Login();
    const requestBody: LoginUserDto = {
      email: 'user@example.com',
      password: 'Sup3r$ecret',
    };
    const session = {
      roles: ['Member', 'RO'],
      rangeRoles: { '12': ['Range Officer'] },
    };
    const token = 'session-token';
    const authService = {
      login: vi.fn().mockResolvedValue(
        Result.ok({
          token,
          session,
        }),
      ),
    };

    const { ctx, spies } = createContext({
      body: requestBody,
      dependencies: { authService },
    });

    const response = await loginEndpoint.handle(ctx as never);

    expect(spies.reqJson).toHaveBeenCalledOnce();
    expect(spies.get).toHaveBeenCalledWith('authService');
    expect(authService.login).toHaveBeenCalledWith(requestBody);
    expect(spies.header).toHaveBeenCalledWith('Set-Cookie', expect.any(String), { append: true });

    const headerCall = spies.header.mock.calls[0];
    const cookieString = headerCall[1];

    expect(cookieString).toContain(`session_token=${token}`);
    expect(cookieString).toContain('HttpOnly');
    expect(cookieString).toContain('Secure');
    expect(cookieString).toContain('SameSite=Strict');
    expect(cookieString).toContain('Max-Age=3600');

    expect(spies.json).toHaveBeenCalledWith({
      message: 'Login successful.',
      roles: session.roles,
      rangeRoles: session.rangeRoles,
    });
    expect(response).toEqual({
      payload: {
        message: 'Login successful.',
        roles: session.roles,
        rangeRoles: session.rangeRoles,
      },
      status: undefined,
    });
  });

  it('returns a 401 response with the error message when login fails', async () => {
    const loginEndpoint = new Login();
    const requestBody: LoginUserDto = {
      email: 'user@example.com',
      password: 'wrong-pass',
    };
    const error = new InvalidCredentialsError();
    const authService = {
      login: vi.fn().mockResolvedValue(Result.fail(error)),
    };

    const { ctx, spies } = createContext({
      body: requestBody,
      dependencies: { authService },
    });

    const response = await loginEndpoint.handle(ctx as never);

    expect(spies.reqJson).toHaveBeenCalledOnce();
    expect(spies.get).toHaveBeenCalledWith('authService');
    expect(authService.login).toHaveBeenCalledWith(requestBody);
    expect(spies.header).not.toHaveBeenCalled();
    expect(spies.json).toHaveBeenCalledWith({ message: error.message }, 401);
    expect(response).toEqual({ payload: { message: error.message }, status: 401 });
  });
});
