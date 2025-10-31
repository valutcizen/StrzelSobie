import { describe, expect, it, vi } from 'vitest';
import { InvalidCredentialsError, Result } from '@strzel-sobie/common/models';
import { Login } from '../../../src/worker/src/endpoints/v1/auth/login';
import { createWorkerTestClient } from '../utils/app';
import { mockConsoleError } from '../utils/console';

mockConsoleError();

describe('POST /api/v1/auth/login', () => {
  it('authenticates the user and forwards session details returned by the auth service', async () => {
    const authService = {
      login: vi.fn().mockResolvedValue(
        Result.ok({
          token: 'test-session-token',
          session: {
            roles: ['Member'],
            rangeRoles: { '12': ['Range Officer'] },
          },
        }),
      ),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.post('/api/v1/auth/login', Login);
      },
      dependencies: { authService },
    });

    const response = await client.post('/api/v1/auth/login', {
      json: { email: 'member@example.com', password: 'Sup3r$ecret' },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: 'Login successful.',
      roles: ['Member'],
      rangeRoles: { '12': ['Range Officer'] },
    });
    expect(authService.login).toHaveBeenCalledWith({
      email: 'member@example.com',
      password: 'Sup3r$ecret',
    });
    expect(response.headers.get('set-cookie')).toContain('session_token=test-session-token');
  });

  it('propagates invalid login attempts as 401 responses', async () => {
    const authService = {
      login: vi.fn().mockResolvedValue(Result.fail(new InvalidCredentialsError())),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.post('/api/v1/auth/login', Login);
      },
      dependencies: { authService },
    });

    const response = await client.post('/api/v1/auth/login', {
      json: { email: 'member@example.com', password: 'wrong-pass' },
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: 'Invalid email or password' });
    expect(authService.login).toHaveBeenCalledOnce();
  });
});
