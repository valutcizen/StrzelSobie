import { ISessionRepository } from '../domain/session.repository';
import { KVNamespace } from '@cloudflare/workers-types';

export class SessionKvRepository implements ISessionRepository {
  constructor(private readonly kv: KVNamespace) {}

  async createSession(userId: number): Promise<string> {
    const token = crypto.randomUUID();
    await this.kv.put(token, userId.toString(), { expirationTtl: 3600 }); // 1 hour TTL
    return token;
  }

  async getSession(token: string): Promise<number | null> {
    const userId = await this.kv.get(token);
    return userId ? parseInt(userId, 10) : null;
  }

  async deleteSession(token: string): Promise<void> {
    await this.kv.delete(token);
  }
}
