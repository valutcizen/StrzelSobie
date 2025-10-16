import { IUserRepository } from '../domain/user.repository';
import { IDatabase, MeDto, Role, UserIdentifierDto, GetUsersOptions, User } from '@strzel-sobie/common';

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

  async getFullUserProfile(userId: number): Promise<MeDto | null> {
    // 1. Get user basic info
    const userStmt = this.db.prepare('SELECT id, email, phone_number FROM users_users WHERE id = ?');
    const userResult = await userStmt.bind(userId).first<{ id: number; email: string; phone_number: string | null }>();

    if (!userResult) {
      return null;
    }

    // 2. Get global roles
    const globalRolesStmt = this.db.prepare(`
      SELECT r.name
      FROM users_user_global_roles ugr
      JOIN users_roles r ON ugr.role_id = r.id
      WHERE ugr.user_id = ?
    `);
    const globalRolesResult = await globalRolesStmt.bind(userId).all<{ name: string }>();
    const globalRoles = globalRolesResult.results ? globalRolesResult.results.map((row) => row.name) : [];

    // 3. Get range roles
    const rangeRolesStmt = this.db.prepare(`
      SELECT sr.slug, r.name
      FROM users_user_range_roles urr
      JOIN users_roles r ON urr.role_id = r.id
      JOIN ranges_shooting_ranges sr ON urr.range_id = sr.id
      WHERE urr.user_id = ?
    `);
    const rangeRolesResult = await rangeRolesStmt.bind(userId).all<{ slug: string; name: string }>();

    const rangeRoles: Record<string, string[]> = {};
    if (rangeRolesResult.results) {
      for (const row of rangeRolesResult.results) {
        if (!rangeRoles[row.slug]) {
          rangeRoles[row.slug] = [];
        }
        rangeRoles[row.slug].push(row.name);
      }
    }

    return {
      id: userResult.id,
      email: userResult.email,
      phoneNumber: userResult.phone_number,
      roles: globalRoles,
      rangeRoles: rangeRoles,
    };
  }

  async getRoles(): Promise<Role[]> {
    const stmt = this.db.prepare('SELECT id, name, scope FROM users_roles');
    const result = await stmt.all<Role>();
    return result.results || [];
  }

  async getById(id: number): Promise<User | null> {
    const stmt = this.db.prepare(
      'SELECT id, email, phone_number, is_deleted, created_at FROM users_users WHERE id = ?'
    );
    const result = await stmt.bind(id).first<User>();

    return result || null;
  }
  async getByEmail(email: string): Promise<User | null> {
    throw new Error('Method not implemented.');
  }
  async add(user: User): Promise<User> {
    throw new Error('Method not implemented.');
  }
  async update(user: User): Promise<User> {
    throw new Error('Method not implemented.');
  }

  async findAndCount(options: GetUsersOptions = {}): Promise<{ users: User[]; total: number; }> {
    const { page = 1, limit = 10, sortBy = 'id', sortOrder = 'desc', filter } = options;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params: (string | number)[] = [];

    if (filter) {
      whereClause = 'WHERE email LIKE ?';
      params.push(`%${filter}%`);
    }

    const countStmt = this.db.prepare(`SELECT COUNT(*) as total FROM users_users ${whereClause}`);
    const countResult = await countStmt.bind(...params).first<{ total: number }>();
    const total = countResult?.total || 0;

    const sortColumn = ['id', 'email', 'createdAt'].includes(sortBy) ? sortBy : 'id';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const dataStmt = this.db.prepare(
      `SELECT id, email, is_deleted, created_at FROM users_users ${whereClause} ORDER BY ${sortColumn} ${order} LIMIT ? OFFSET ?`
    );
    params.push(limit, offset);

    const { results } = await dataStmt.bind(...params).all<User>();

    return {
      users: results || [],
      total: total,
    };
  }

  async assignGlobalRole(userId: number, roleId: number): Promise<void> {
    const stmt = this.db.prepare('INSERT INTO users_user_global_roles (user_id, role_id) VALUES (?, ?)');
    await stmt.bind(userId, roleId).run();
  }

  async assignRangeRole(userId: number, roleId: number, rangeId: number): Promise<void> {
    const stmt = this.db.prepare('INSERT INTO users_user_range_roles (user_id, role_id, range_id) VALUES (?, ?, ?)');
    await stmt.bind(userId, roleId, rangeId).run();
  }

  async removeGlobalRole(userId: number, roleId: number): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM users_user_global_roles WHERE user_id = ? AND role_id = ?');
    await stmt.bind(userId, roleId).run();
  }

  async removeRangeRole(userId: number, roleId: number, rangeId: number): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM users_user_range_roles WHERE user_id = ? AND role_id = ? AND range_id = ?');
    await stmt.bind(userId, roleId, rangeId).run();
  }
}
