import { KVNamespace } from '@cloudflare/workers-types';
import { SessionData } from '@strzel-sobie/common/models';
import { ISessionRepository } from '../domain/session.repository';

export class SessionKvRepository implements ISessionRepository {
  constructor(private readonly kv: KVNamespace) {}

  async createSession(session: SessionData): Promise<string> {
    const token = crypto.randomUUID();
    await this.kv.put(token, JSON.stringify(session), { expirationTtl: 3600 }); // 1 hour TTL
    return token;
  }

  async getSession(token: string): Promise<SessionData | null> {
    const session = await this.kv.get(token);
    return session ? JSON.parse(session) : null;
  }

  async deleteSession(token: string): Promise<void> {
    await this.kv.delete(token);
  }
}
