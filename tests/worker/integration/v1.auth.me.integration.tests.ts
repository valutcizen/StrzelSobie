import { describe, expect, it } from 'vitest';
import { Me } from '../../../src/worker/src/endpoints/v1/auth/me';
import { createWorkerTestClient } from '../utils/app';
import { mockConsoleError } from '../utils/console';

mockConsoleError();

describe('GET /api/v1/auth/me', () => {
  it('returns the session profile assembled by the auth middleware', async () => {
    const session = {
      userId: 42,
      email: 'shooter@example.com',
      phoneNumber: '+48123123123',
      roles: ['Member'],
      rangeRoles: { '7': ['Range Officer'] },
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.get('/api/v1/auth/me', Me);
      },
      dependencies: { session },
    });

    const response = await client.get('/api/v1/auth/me');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: 42,
      email: 'shooter@example.com',
      phoneNumber: '+48123123123',
      roles: ['Member'],
      rangeRoles: { '7': ['Range Officer'] },
    });
  });
});
