import { KVNamespace } from '@cloudflare/workers-types';
import { SessionData } from '@strzel-sobie/common/models';
import { ISessionRepository } from '../domain/session.repository';

const SESSION_TTL_SECONDS = 3600;
const PROLONGATION_INTERVAL_MS = 10 * 60 * 1000;

type SessionMetadata = {
  nextProlongAt: number;
};

export class SessionKvRepository implements ISessionRepository {
  constructor(private readonly kv: KVNamespace) {}

  async createSession(session: SessionData): Promise<string> {
    const token = crypto.randomUUID();
    const now = Date.now();

    await this.kv.put(token, JSON.stringify(session), {
      expirationTtl: SESSION_TTL_SECONDS,
      metadata: { nextProlongAt: now + PROLONGATION_INTERVAL_MS },
    });

    return token;
  }

  async getSession(token: string): Promise<SessionData | null> {
    const sessionWithMetadata = await this.kv.getWithMetadata<SessionMetadata>(token);

    if (!sessionWithMetadata || !sessionWithMetadata.value) {
      return null;
    }

    const session = JSON.parse(sessionWithMetadata.value) as SessionData;

    if (this.shouldProlong(sessionWithMetadata.metadata)) {
      const now = Date.now();
      await this.kv.put(token, sessionWithMetadata.value, {
        expirationTtl: SESSION_TTL_SECONDS,
        metadata: { nextProlongAt: now + PROLONGATION_INTERVAL_MS },
      });
    }

    return session;
  }

  async deleteSession(token: string): Promise<void> {
    await this.kv.delete(token);
  }

  private shouldProlong(metadata: SessionMetadata | null): boolean {
    if (!metadata || typeof metadata.nextProlongAt !== 'number') {
      return true;
    }

    return Date.now() >= metadata.nextProlongAt;
  }
}
