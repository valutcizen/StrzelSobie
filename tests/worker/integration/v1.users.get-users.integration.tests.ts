import type { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import { Result } from '@strzel-sobie/common';
import { GetUsers } from '../../../src/worker/src/endpoints/v1/user/get-users';
import { createWorkerTestClient } from '../utils/app';
import { mockConsoleError } from '../utils/console';

mockConsoleError();

describe('GET /api/v1/users', () => {
  const setupQueryValidator = (app: Hono) => {
    app.use('/api/v1/users', async (c, next) => {
      const url = new URL(c.req.url);
      const query = Object.fromEntries(url.searchParams.entries());

      c.req.valid = ((type: string) => {
        if (type !== 'query') {
          return undefined;
        }

        return {
          page: query.page ? Number(query.page) : undefined,
          limit: query.limit ? Number(query.limit) : undefined,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
          filter: query.filter,
        };
      }) as never;

      await next();
    });
  };

  it('passes validated query parameters to the user service and returns the page payload', async () => {
    const userService = {
      getUsers: vi.fn().mockResolvedValue(
        Result.ok({
          data: [
            {
              id: 1,
              email: 'first@example.com',
              isDeleted: 0,
              createdAt: '2024-01-01T10:00:00.000Z',
            },
          ],
          pagination: { total: 1, page: 2, limit: 5 },
        }),
      ),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.get('/api/v1/users', GetUsers);
      },
      setupApp: setupQueryValidator,
      dependencies: { userService },
    });

    const response = await client.get(
      '/api/v1/users?page=2&limit=5&sortBy=email&sortOrder=asc&filter=test',
    );

    expect(userService.getUsers).toHaveBeenCalledWith({
      page: 2,
      limit: 5,
      sortBy: 'email',
      sortOrder: 'asc',
      filter: 'test',
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [
        {
          id: 1,
          email: 'first@example.com',
          isDeleted: 0,
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      pagination: { total: 1, page: 2, limit: 5 },
    });
  });

  it('returns a 500 error when the user service cannot fulfil the request', async () => {
    const userService = {
      getUsers: vi.fn().mockResolvedValue(Result.fail(new Error('Database unavailable'))),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.get('/api/v1/users', GetUsers);
      },
      setupApp: setupQueryValidator,
      dependencies: { userService },
    });

    const response = await client.get('/api/v1/users');

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Database unavailable' });
  });
});
