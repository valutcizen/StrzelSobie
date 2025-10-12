import { IDatabase } from '@strzel-sobie/common';
import { IAuthRepository } from '../domain/auth.repository';

export class AuthDbRepository implements IAuthRepository {
  constructor(private readonly db: IDatabase) {}

  async saveCredentials(userId: number, passwordHash: string): Promise<void> {
    const stmt = this.db.prepare('INSERT INTO auth_user_credentials (user_id, password_hash) VALUES (?, ?)');
    await stmt.bind(userId, passwordHash).run();
  }
}
