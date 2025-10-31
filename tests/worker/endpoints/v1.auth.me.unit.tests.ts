import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Me } from '../../../src/worker/src/endpoints/v1/auth/me';
import type { SessionData } from '@strzel-sobie/common/models';

type TestContextOptions = {
  session?: SessionData;
};

const createContext = ({ session }: TestContextOptions = {}) => {
  const jsonSpy = vi.fn((payload: unknown, status?: number) => ({ payload, status }));
  const getSpy = vi.fn((key: string) => {
    if (key === 'session') {
      return session;
    }
    return undefined;
  });

  const ctx = {
    json: jsonSpy,
    get: getSpy,
  };

  return {
    ctx,
    spies: {
      json: jsonSpy,
      get: getSpy,
    },
  };
};

describe('Me endpoint contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the current user profile when a session is available', async () => {
    const meEndpoint = new Me();
    const session: SessionData = {
      userId: 42,
      email: 'user@example.com',
      phoneNumber: '+48123123123',
      roles: ['Member', 'RO'],
      rangeRoles: {
        '1': ['Range Officer'],
        '2': ['Support'],
      },
    };

    const { ctx, spies } = createContext({ session });

    const response = await meEndpoint.handle(ctx as never);

    expect(spies.get).toHaveBeenCalledWith('session');
    expect(spies.json).toHaveBeenCalledWith({
      id: session.userId,
      email: session.email,
      phoneNumber: session.phoneNumber,
      roles: session.roles,
      rangeRoles: session.rangeRoles,
    });
    expect(response).toEqual({
      payload: {
        id: session.userId,
        email: session.email,
        phoneNumber: session.phoneNumber,
        roles: session.roles,
        rangeRoles: session.rangeRoles,
      },
      status: undefined,
    });
  });

  it('throws a TypeError when the session is missing', async () => {
    const meEndpoint = new Me();

    const { ctx, spies } = createContext();

    await expect(meEndpoint.handle(ctx as never)).rejects.toBeInstanceOf(TypeError);
    expect(spies.get).toHaveBeenCalledWith('session');
    expect(spies.json).not.toHaveBeenCalled();
  });
});
