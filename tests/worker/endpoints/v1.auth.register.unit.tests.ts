import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Register } from '../../../src/worker/src/endpoints/v1/auth/register';
import { EmailAlreadyExistsError, Result } from '@strzel-sobie/common/models';

type RegisteredUserResponse = {
  id: number;
  email: string;
  roles: string[];
};

type RegisterDependencies = {
  authService: {
    register: ReturnType<typeof vi.fn>;
  };
};

type TestContextOptions = {
  headers?: Record<string, string>;
  dependencies: RegisterDependencies;
};

const createContext = ({ headers = {}, dependencies }: TestContextOptions) => {
  const normalizedHeaders = new Map<string, string>();
  Object.entries(headers).forEach(([key, value]) => {
    normalizedHeaders.set(key.toLowerCase(), value);
  });

  const headerSpy = vi.fn((name: string) => normalizedHeaders.get(name.toLowerCase()));
  const jsonSpy = vi.fn();
  const getSpy = vi.fn((key: string) => {
    if (key === 'authService') {
      return dependencies.authService;
    }
    return undefined;
  });

  const ctx = {
    req: {
      header: headerSpy,
    },
    json: jsonSpy,
    get: getSpy,
  };

  return {
    ctx,
    spies: {
      header: headerSpy,
      json: jsonSpy,
      get: getSpy,
    },
  };
};

describe('Register endpoint contract', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns the registered user payload with a 201 status code', async () => {
    const registerEndpoint = new Register();
    const requestBody = { body: {email: 'new-user@example.com', password: 'Secret123' }};
    const registeredUser: RegisteredUserResponse = {
      id: 42,
      email: requestBody.email,
      roles: ['Member'],
    };

    const authService = {
      register: vi.fn().mockResolvedValue(Result.ok<RegisteredUserResponse>(registeredUser)),
    };
    const { ctx, spies } = createContext({
      dependencies: { authService },
      headers: {
        'cf-connecting-ip': '203.0.113.10',
        'x-forwarded-for': '198.51.100.7',
      },
    });

    const getValidatedData = vi.fn().mockResolvedValue(requestBody);
    (registerEndpoint as unknown as { getValidatedData: typeof getValidatedData }).getValidatedData =
      getValidatedData;

    const response = await registerEndpoint.handle(ctx as never);

    expect(getValidatedData).toHaveBeenCalledOnce();
    expect(authService.register).toHaveBeenCalledWith(
      requestBody.body,
      '203.0.113.10',
      '198.51.100.7'
    );
    expect(spies.json).toHaveBeenCalledWith(registeredUser, 201);
  });

  it('maps EmailAlreadyExistsError to a 409 conflict response', async () => {
    const registerEndpoint = new Register();
    const requestBody = { body: { email: 'taken@example.com', password: 'Secret123' }};
    const error = new EmailAlreadyExistsError(requestBody.body.email);

    const authService = {
      register: vi.fn().mockResolvedValue(Result.fail<RegisteredUserResponse>(error)),
    };
    const { ctx, spies } = createContext({
      dependencies: { authService },
    });

    const getValidatedData = vi.fn().mockResolvedValue(requestBody);
    (registerEndpoint as unknown as { getValidatedData: typeof getValidatedData }).getValidatedData =
      getValidatedData;

    const response = await registerEndpoint.handle(ctx as never);

    expect(authService.register).toHaveBeenCalledWith(requestBody.body, 'unknown', 'unknown');
    expect(spies.json).toHaveBeenCalledWith({ message: error.message }, 409);
  });

  it('returns a 500 error when registration fails with an unexpected error', async () => {
    const registerEndpoint = new Register();
    const requestBody = { body: {email: 'user@example.com', password: 'Secret123'} };
    const error = new Error('Database offline');

    const authService = {
      register: vi.fn().mockResolvedValue(Result.fail<RegisteredUserResponse>(error)),
    };
    const { ctx, spies } = createContext({
      dependencies: { authService },
    });

    const getValidatedData = vi.fn().mockResolvedValue(requestBody);
    (registerEndpoint as unknown as { getValidatedData: typeof getValidatedData }).getValidatedData =
      getValidatedData;

    const response = await registerEndpoint.handle(ctx as never);

    expect(authService.register).toHaveBeenCalledWith(requestBody.body, 'unknown', 'unknown');
    expect(spies.json).toHaveBeenCalledWith({ message: 'Internal Server Error' }, 500);
  });
});

