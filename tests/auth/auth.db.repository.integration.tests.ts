import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { AuthDbRepository } from '../../src/auth/src/infrastructure/auth.db.repository';
import { createTestDatabase, type TestDatabase } from '../utils/database';

describe('AuthDbRepository integration', () => {
  let dbHandle: TestDatabase;
  let repository: AuthDbRepository;

  beforeEach(async () => {
    dbHandle = await createTestDatabase();
    repository = new AuthDbRepository(dbHandle.db);
  });

  afterEach(() => {
    dbHandle.cleanup();
  });

  it('findCredentialsByUserId returns credentials when record exists', async () => {
    const credentials = await repository.findCredentialsByUserId(1);

    expect(credentials).toEqual({
      userId: 1,
      passwordHash: '$2b$10$FU.WmIzyOoL.NzISIP2/d.87Ny.70117VDrog6t4I5jNY6sZH3TWy',
    });
  });

  it('findCredentialsByUserId returns null for unknown user', async () => {
    const credentials = await repository.findCredentialsByUserId(999);
    expect(credentials).toBeNull();
  });

  it('saveCredentials persists new credentials', async () => {
    await dbHandle.d1
      .prepare('INSERT INTO users_users (email, phone_number) VALUES (?, ?)')
      .bind('new-user@example.com', null)
      .run();

    await repository.saveCredentials(5, 'hashed-password');

    const stored = await repository.findCredentialsByUserId(5);
    expect(stored).toEqual({
      userId: 5,
      passwordHash: 'hashed-password',
    });
  });
});
