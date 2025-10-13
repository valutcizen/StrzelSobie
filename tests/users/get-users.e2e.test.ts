import { describe, it, expect, vi, beforeAll } from 'vitest';
import app from '../../src/worker/src/index';
import { AuthService } from '@strzel-sobie/auth';
import { UserService } from '@strzel-sobie/users';
import { Result } from '@strzel-sobie/common';

vi.mock('@strzel-sobie/auth');
vi.mock('@strzel-sobie/users');

describe('GET /api/v1/users', () => {
  let authService: AuthService;
  let userService: UserService;

  beforeAll(() => {
    authService = new AuthService(null as any, null as any, null as any, null as any);
    userService = new UserService(null as any);
  });

  it('should return 401 for unauthenticated user', async () => {
    vi.spyOn(authService, 'validateSession').mockResolvedValue(Result.err(new Error('Unauthorized')));
    app.use('*', (c, next) => {
      c.set('authService', authService);
      return next();
    });

    const res = await app.request('/api/v1/users');
    expect(res.status).toBe(401);
  });

  it('should return 403 for user without Admin or Confirmator role', async () => {
    vi.spyOn(authService, 'validateSession').mockResolvedValue(Result.ok({ userId: 1, roles: ['User'] } as any));
    app.use('*', (c, next) => {
      c.set('authService', authService);
      return next();
    });

    const res = await app.request('/api/v1/users');
    expect(res.status).toBe(403);
  });

  it('should return 200 for admin user', async () => {
    vi.spyOn(authService, 'validateSession').mockResolvedValue(Result.ok({ userId: 1, roles: ['Admin'] } as any));
    vi.spyOn(userService, 'getUsers').mockResolvedValue(Result.ok({ data: [], pagination: { total: 0, page: 1, limit: 10 } }));
    app.use('*', (c, next) => {
      c.set('authService', authService);
      c.set('userService', userService);
      return next();
    });

    const res = await app.request('/api/v1/users');
    expect(res.status).toBe(200);
  });

  it('should return 200 for confirmator user', async () => {
    vi.spyOn(authService, 'validateSession').mockResolvedValue(Result.ok({ userId: 1, roles: ['Confirmator'] } as any));
    vi.spyOn(userService, 'getUsers').mockResolvedValue(Result.ok({ data: [], pagination: { total: 0, page: 1, limit: 10 } }));
    app.use('*', (c, next) => {
      c.set('authService', authService);
      c.set('userService', userService);
      return next();
    });

    const res = await app.request('/api/v1/users');
    expect(res.status).toBe(200);
  });

  it('should return 400 for invalid page parameter', async () => {
    vi.spyOn(authService, 'validateSession').mockResolvedValue(Result.ok({ userId: 1, roles: ['Admin'] } as any));
    app.use('*', (c, next) => {
      c.set('authService', authService);
      return next();
    });

    const res = await app.request('/api/v1/users?page=abc');
    expect(res.status).toBe(400);
  });

  it('should return 400 for invalid limit parameter', async () => {
    vi.spyOn(authService, 'validateSession').mockResolvedValue(Result.ok({ userId: 1, roles: ['Admin'] } as any));
    app.use('*', (c, next) => {
      c.set('authService', authService);
      return next();
    });

    const res = await app.request('/api/v1/users?limit=200');
    expect(res.status).toBe(400);
  });

  it('should call userService.getUsers with correct parameters', async () => {
    vi.spyOn(authService, 'validateSession').mockResolvedValue(Result.ok({ userId: 1, roles: ['Admin'] } as any));
    const getUsersSpy = vi.spyOn(userService, 'getUsers').mockResolvedValue(Result.ok({ data: [], pagination: { total: 0, page: 1, limit: 10 } }));
    app.use('*', (c, next) => {
      c.set('authService', authService);
      c.set('userService', userService);
      return next();
    });

    await app.request('/api/v1/users?page=2&limit=20&sortBy=email&sortOrder=asc&filter=test');
    
    expect(getUsersSpy).toHaveBeenCalledWith({
      page: 2,
      limit: 20,
      sortBy: 'email',
      sortOrder: 'asc',
      filter: 'test'
    });
  });
});
