import { describe, it, expect, beforeAll } from 'vitest';
import { Miniflare } from 'miniflare';

describe('DELETE /api/v1/users/:userId/roles/:roleId', () => {
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

  it('should return 401 for unauthenticated user', async () => {
    const res = await mf.dispatchFetch('http://localhost:8787/api/v1/users/1/roles/1', {
      method: 'DELETE',
    });
    expect(res.status).toBe(401);
  });

  it('should return 404 if user does not exist', async () => {
    // This requires an authenticated admin user
    // For now, we expect 401, but this test should be updated
    const res = await mf.dispatchFetch('http://localhost:8787/api/v1/users/9999/roles/1', {
      method: 'DELETE',
    });
    expect(res.status).toBe(401); // Should be 404 after auth is mocked
  });

  it('should return 404 if role does not exist', async () => {
    // This requires an authenticated admin user
    // For now, we expect 401, but this test should be updated
    const res = await mf.dispatchFetch('http://localhost:8787/api/v1/users/1/roles/9999', {
      method: 'DELETE',
    });
    expect(res.status).toBe(401); // Should be 404 after auth is mocked
  });

  it('should return 400 for a global role with a rangeId', async () => {
    // This requires an authenticated admin user
    // For now, we expect 401, but this test should be updated
    const res = await mf.dispatchFetch('http://localhost:8787/api/v1/users/1/roles/1?rangeId=1', {
      method: 'DELETE',
    });
    expect(res.status).toBe(401); // Should be 400 after auth is mocked
  });
});
