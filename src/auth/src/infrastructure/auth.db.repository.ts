import { AuthCredentials, IDatabase } from '@strzel-sobie/common/models';
import { IAuthRepository } from '../domain/auth.repository';

export class AuthDbRepository implements IAuthRepository {
  constructor(private readonly db: IDatabase) {}

  async findCredentialsByUserId(userId: number): Promise<AuthCredentials | null> {
    const stmt = this.db.prepare('SELECT user_id, password_hash FROM auth_user_credentials WHERE user_id = ?');
    const result = await stmt.bind(userId).first<{ user_id: number; password_hash: string }>();

    if (!result) {
      return null;
    }

    return { userId: result.user_id, passwordHash: result.password_hash };
  }

  async saveCredentials(userId: number, passwordHash: string): Promise<void> {
    const stmt = this.db.prepare('INSERT INTO auth_user_credentials (user_id, password_hash) VALUES (?, ?)');
    await stmt.bind(userId, passwordHash).run();
  }
}
