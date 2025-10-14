import { describe, it, expect, beforeAll } from 'vitest';
import { Miniflare } from 'miniflare';

describe('POST /api/v1/users/:userId/roles', () => {
  let mf: Miniflare;

  beforeAll(async () => {
    mf = new Miniflare({
      scriptPath: '../../src/worker/dist/index.js',
      modules: true,
      envPath: true,
      packagePath: true,
    });
  });

  // TODO: Add tests for authentication and authorization

  it('should return 400 for invalid request body', async () => {
    const res = await mf.dispatchFetch('http://localhost:8787/api/v1/users/1/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId: 'invalid' }),
    });
    expect(res.status).toBe(400);
  });

  it('should return 404 if user does not exist', async () => {
    const res = await mf.dispatchFetch('http://localhost:8787/api/v1/users/9999/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId: 1, rangeId: null }),
    });
    expect(res.status).toBe(404);
  });

  it('should return 404 if role does not exist', async () => {
    const res = await mf.dispatchFetch('http://localhost:8787/api/v1/users/1/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId: 9999, rangeId: null }),
    });
    expect(res.status).toBe(404);
  });

  it('should return 401 for unauthenticated user', async () => {
    // This test assumes a user with id 1 and a global role with id 1 exist.
    const res = await mf.dispatchFetch('http://localhost:8787/api/v1/users/1/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId: 1, rangeId: null }),
    });
    expect(res.status).toBe(401);
  });
});
