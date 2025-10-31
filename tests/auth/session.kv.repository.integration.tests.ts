import { describe, it, expect, beforeEach } from 'vitest';
import type { SessionData } from '@strzel-sobie/common/models';
import { SessionKvRepository } from '../../src/auth/src/infrastructure/session.kv.repository';
import type { KVNamespace, KVNamespaceListResult, KVListOptions, KVValueAndMetadata } from '@cloudflare/workers-types';

class InMemoryKv implements KVNamespace {
  private readonly store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async getWithMetadata<T>(_key: string): Promise<KVValueAndMetadata<string, T> | null> {
    return null;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(_options?: KVListOptions): Promise<KVNamespaceListResult<unknown, string>> {
    return {
      keys: Array.from(this.store.keys()).map((name) => ({
        name,
        expiration: null,
        metadata: null,
      })),
      list_complete: true,
      cursor: '',
    };
  }
}

describe('SessionKvRepository integration', () => {
  let kv: InMemoryKv;
  let repository: SessionKvRepository;
  let session: SessionData;

  beforeEach(() => {
    kv = new InMemoryKv();
    repository = new SessionKvRepository(kv as unknown as KVNamespace);
    session = {
      userId: 1,
      email: 'admin@example.com',
      phoneNumber: '111222333',
      roles: ['Club/Community Administrator'],
      rangeRoles: {},
    };
  });

  it('createSession stores session data and returns token', async () => {
    const token = await repository.createSession(session);
    expect(typeof token).toBe('string');
    expect(token).not.toHaveLength(0);

    const stored = await repository.getSession(token);
    expect(stored).toEqual(session);
  });

  it('getSession returns null for unknown token', async () => {
    const stored = await repository.getSession('missing');
    expect(stored).toBeNull();
  });

  it('deleteSession removes stored session', async () => {
    const token = await repository.createSession(session);
    await repository.deleteSession(token);

    const stored = await repository.getSession(token);
    expect(stored).toBeNull();
  });
});
