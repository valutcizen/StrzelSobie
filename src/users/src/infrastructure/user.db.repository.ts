import { IUserRepository } from '../domain/user.repository';
import { IDatabase, UserIdentifierDto } from '@strzel-sobie/common';

export class UserDbRepository implements IUserRepository {
  constructor(private readonly db: IDatabase) {}

  async findByEmail(email: string): Promise<UserIdentifierDto | null> {
    const stmt = this.db.prepare('SELECT id, email FROM users_users WHERE email = ?');
    const result = await stmt.bind(email).first<{ id: number; email: string }>();

    if (!result) {
      return null;
    }

    return { id: result.id, email: result.email };
  }

  async create(email: string): Promise<UserIdentifierDto> {
    const stmt = this.db.prepare('INSERT INTO users_users (email) VALUES (?) RETURNING id, email');
    const result = await stmt.bind(email).first<{ id: number; email: string }>();

    if (!result) {
      // This should not happen in normal circumstances
      throw new Error('Could not create user');
    }

    return { id: result.id, email: result.email };
  }
}
