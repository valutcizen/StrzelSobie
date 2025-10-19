import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { UserDbRepository } from '../../src/users/src/infrastructure/user.db.repository';
import { createTestDatabase, type TestDatabase } from '../utils/database';

describe('UserDbRepository integration', () => {
  let dbHandle: TestDatabase;
  let repository: UserDbRepository;

  beforeEach(async () => {
    dbHandle = await createTestDatabase();
    repository = new UserDbRepository(dbHandle.db);
  });

  afterEach(() => {
    dbHandle.cleanup();
  });

  it('findByEmail returns matching user identifier', async () => {
    const user = await repository.findByEmail('admin@example.com');
    expect(user).toEqual({ id: 1, email: 'admin@example.com' });
  });

  it('findByEmail returns null when user is missing', async () => {
    const user = await repository.findByEmail('missing@example.com');
    expect(user).toBeNull();
  });

  it('create adds new user record', async () => {
    const user = await repository.create('new-user@example.com');
    expect(user.email).toBe('new-user@example.com');
    expect(user.id).toBeGreaterThan(4);

    const stored = await dbHandle.d1
      .prepare('SELECT email FROM users_users WHERE id = ?')
      .bind(user.id)
      .first<{ email: string }>();
    expect(stored?.email).toBe('new-user@example.com');
  });

  it('getFullUserProfile returns full profile with roles', async () => {
    await dbHandle.d1
      .prepare('INSERT INTO users_user_range_roles (user_id, role_id, range_id) VALUES (?, ?, ?)')
      .bind(2, 5, 1)
      .run();

    const profile = await repository.getFullUserProfile(2);

    expect(profile).not.toBeNull();
    expect(profile?.email).toBe('coordinator@example.com');
    expect(profile?.roles).toEqual(expect.arrayContaining(['Coordinator', 'Member', 'Guest']));
    expect(profile?.rangeRoles['1']).toEqual(expect.arrayContaining(['Shooting Range Administrator']));
  });

  it('getFullUserProfile returns null for unknown user', async () => {
    const profile = await repository.getFullUserProfile(999);
    expect(profile).toBeNull();
  });

  it('getById returns stored user details', async () => {
    const user = await repository.getById(1);
    expect(user).toMatchObject({
      id: 1,
      email: 'admin@example.com',
      is_deleted: 0,
    });
  });

  it('findAndCount handles filtering and pagination', async () => {
    const { users, total } = await repository.findAndCount({ filter: 'example.com', limit: 2, page: 2 });

    expect(total).toBeGreaterThanOrEqual(4);
    expect(users.length).toBe(2);
    expect(users[0]).toHaveProperty('email');
  });

  it('getRoles returns available role definitions', async () => {
    const roles = await repository.getRoles();
    expect(roles).toHaveLength(6);
    expect(roles.map((role) => role.name)).toEqual(
      expect.arrayContaining([
        'Guest',
        'Member',
        'Coordinator',
        'Confirmator',
        'Shooting Range Administrator',
        'Club/Community Administrator',
      ])
    );
  });

  it('assignGlobalRole persists role assignment', async () => {
    await repository.assignGlobalRole(4, 3);
    const record = await dbHandle.d1
      .prepare('SELECT role_id FROM users_user_global_roles WHERE user_id = ? AND role_id = ?')
      .bind(4, 3)
      .first<{ role_id: number }>();

    expect(record?.role_id).toBe(3);
  });

  it('assignRangeRole persists range-specific role', async () => {
    await repository.assignRangeRole(4, 5, 1);
    const record = await dbHandle.d1
      .prepare('SELECT role_id FROM users_user_range_roles WHERE user_id = ? AND range_id = ?')
      .bind(4, 1)
      .first<{ role_id: number }>();

    expect(record?.role_id).toBe(5);
  });

  it('removeGlobalRole deletes assignment', async () => {
    await repository.removeGlobalRole(1, 6);
    const record = await dbHandle.d1
      .prepare('SELECT 1 FROM users_user_global_roles WHERE user_id = ? AND role_id = ?')
      .bind(1, 6)
      .first<number>();

    expect(record).toBeNull();
  });

  it('removeRangeRole deletes range assignment', async () => {
    await repository.assignRangeRole(3, 5, 1);
    await repository.removeRangeRole(3, 5, 1);

    const record = await dbHandle.d1
      .prepare('SELECT 1 FROM users_user_range_roles WHERE user_id = ? AND role_id = ? AND range_id = ?')
      .bind(3, 5, 1)
      .first<number>();

    expect(record).toBeNull();
  });
});
