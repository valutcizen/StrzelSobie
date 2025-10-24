import { describe, expect, it, vi } from 'vitest';
import { EmailAlreadyExistsError, Result } from '@strzel-sobie/common';
import { Register } from '../../../src/worker/src/endpoints/v1/auth/register';
import { createWorkerTestClient } from '../utils/app';
import { mockConsoleError } from '../utils/console';

mockConsoleError();

describe('POST /api/v1/auth/register', () => {
  it('delegates user registration to the auth service with IP metadata', async () => {
    const authService = {
      register: vi.fn().mockResolvedValue(
        Result.ok({
          id: 5,
          email: 'new.user@example.com',
          roles: ['Member'],
        }),
      ),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.post('/api/v1/auth/register', Register);
      },
      dependencies: { authService },
    });

    const response = await client.post('/api/v1/auth/register', {
      headers: {
        'cf-connecting-ip': '203.0.113.1',
        'x-forwarded-for': '198.51.100.2',
      },
      json: {
        email: 'new.user@example.com',
        password: '#Sup3rSecret!',
      },
    });

    const [call] = authService.register.mock.calls;
    expect(call[1]).toBe('203.0.113.1');
    expect(call[2]).toBe('198.51.100.2');
    expect(call[0]).toEqual({
      body: {
        email: 'new.user@example.com',
        password: '#Sup3rSecret!',
      },
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: 5,
      email: 'new.user@example.com',
      roles: ['Member'],
    });
  });

  it('maps email conflicts to a 409 response', async () => {
    const authService = {
      register: vi.fn().mockResolvedValue(
        Result.fail(new EmailAlreadyExistsError('taken@example.com')),
      ),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.post('/api/v1/auth/register', Register);
      },
      dependencies: { authService },
    });

    const response = await client.post('/api/v1/auth/register', {
      json: {
        email: 'taken@example.com',
        password: 'password123',
      },
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      message: 'User with email taken@example.com already exists',
    });
  });
});
