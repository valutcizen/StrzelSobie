import { describe, expect, it, vi } from 'vitest';
import { Logout } from '../../../src/worker/src/endpoints/v1/auth/logout';
import { createWorkerTestClient } from '../utils/app';
import { mockConsoleError } from '../utils/console';

mockConsoleError();

describe('POST /api/v1/auth/logout', () => {
  it('clears the user session using the auth service and expires the cookie', async () => {
    const authService = {
      logout: vi.fn().mockResolvedValue(undefined),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.post('/api/v1/auth/logout', Logout);
      },
      dependencies: { authService },
    });

    const response = await client.post('/api/v1/auth/logout', {
      headers: { Cookie: 'session_token=fake-token' },
    });

    expect(authService.logout).toHaveBeenCalledWith('fake-token');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: 'Logout successful.' });
    const cookie = response.headers.get('set-cookie');
    expect(cookie).toContain('session_token=');
    expect(cookie).toContain('Max-Age=0');
  });

  it('responds with 401 when no session cookie is present', async () => {
    const authService = {
      logout: vi.fn(),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.post('/api/v1/auth/logout', Logout);
      },
      dependencies: { authService },
    });

    const response = await client.post('/api/v1/auth/logout');

    expect(authService.logout).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
  });
});
