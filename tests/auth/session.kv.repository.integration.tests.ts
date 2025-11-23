import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { SessionData } from '@strzel-sobie/common/models';
import { SessionKvRepository } from '../../src/auth/src/infrastructure/session.kv.repository';
import type {
  KVNamespace,
  KVNamespaceListResult,
  KVNamespacePutOptions,
  KVListOptions,
  KVValueAndMetadata,
} from '@cloudflare/workers-types';

type StoredEntry = {
  value: string;
  metadata: unknown;
  expiration: number | null;
};

class InMemoryKv implements KVNamespace {
  private readonly store = new Map<string, StoredEntry>();

  async get(key: string): Promise<string | null> {
    this.removeIfExpired(key);
    return this.store.get(key)?.value ?? null;
  }

  async getWithMetadata<T>(key: string): Promise<KVValueAndMetadata<string, T> | null> {
    this.removeIfExpired(key);
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    return {
      value: entry.value,
      metadata: entry.metadata as T,
    };
  }

  async put(key: string, value: string, options?: KVNamespacePutOptions): Promise<void> {
    const expiration = options?.expirationTtl ? Date.now() + options.expirationTtl * 1000 : null;
    this.store.set(key, { value, metadata: options?.metadata ?? null, expiration });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(_options?: KVListOptions): Promise<KVNamespaceListResult<unknown, string>> {
    for (const key of Array.from(this.store.keys())) {
      this.removeIfExpired(key);
    }

    return {
      keys: Array.from(this.store.entries()).map(([name, entry]) => ({
        name,
        expiration: entry.expiration ? Math.floor(entry.expiration / 1000) : null,
        metadata: entry.metadata,
      })),
      list_complete: true,
      cursor: '',
    };
  }

  private removeIfExpired(key: string): void {
    const entry = this.store.get(key);

    if (entry?.expiration && entry.expiration <= Date.now()) {
      this.store.delete(key);
    }
  }
}

describe('SessionKvRepository integration', () => {
  let kv: InMemoryKv;
  let repository: SessionKvRepository;
  let session: SessionData;
  let now: number;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    now = Date.now();
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

  afterEach(() => {
    vi.useRealTimers();
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

  it('prolongs session TTL when next prolongation time is reached', async () => {
    const token = await repository.createSession(session);
    const initialMetadata = await kv.getWithMetadata<{ lastProlongedAt: number }>(token);
    expect(initialMetadata?.metadata?.lastProlongedAt).toBe(now);

    vi.advanceTimersByTime(10 * 60 * 1000 + 1000);

    const stored = await repository.getSession(token);
    expect(stored).toEqual(session);

    const updatedMetadata = await kv.getWithMetadata<{ lastProlongedAt: number }>(token);
    expect(updatedMetadata?.metadata?.lastProlongedAt).toBe(Date.now());
  });

  it('returns null when session token expired even if prolongation interval passed', async () => {
    const token = await repository.createSession(session);

    vi.advanceTimersByTime(61 * 60 * 1000);

    const stored = await repository.getSession(token);
    expect(stored).toBeNull();

    const list = await kv.list();
    expect(list.keys).toHaveLength(0);
  });
});
