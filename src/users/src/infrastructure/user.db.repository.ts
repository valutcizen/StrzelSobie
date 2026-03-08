import { IUserRepository } from '../domain/user.repository';
import { IDatabase, User, Role } from '@strzel-sobie/common/models';
import {
  AdminContactProfileDto,
  AdminContactProfileOverrideDto,
  GetUsersOptions,
  MeDto,
  UserIdentifierDto,
} from '@strzel-sobie/common';

export class UserDbRepository implements IUserRepository {
  constructor(private readonly db: IDatabase) {}

  async findByEmail(email: string): Promise<UserIdentifierDto | null> {
    const stmt = this.db.prepare('SELECT id, email FROM users_users WHERE email = ? AND is_deleted = 0');
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
    const userStmt = this.db.prepare('SELECT id, email, phone_number, is_deleted FROM users_users WHERE id = ?');
    const userResult = await userStmt.bind(userId).first<{ id: number; email: string; phone_number: string | null; is_deleted: number }>();

    if (!userResult || userResult.is_deleted === 1) {
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
      SELECT urr.range_id, r.name
      FROM users_user_range_roles urr
      JOIN users_roles r ON urr.role_id = r.id
      WHERE urr.user_id = ?
    `);
    const rangeRolesResult = await rangeRolesStmt.bind(userId).all<{ range_id: number; name: string }>();

    const rangeRoles: Record<string, string[]> = {};
    if (rangeRolesResult.results) {
      for (const row of rangeRolesResult.results) {
        const rangeId = row.range_id.toString();
        if (!rangeRoles[rangeId]) {
          rangeRoles[rangeId] = [];
        }
        rangeRoles[rangeId].push(row.name);
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

  async findAndCount(options: GetUsersOptions = {}): Promise<{ users: User[]; total: number; }> {
    const { page = 1, limit = 10, sortBy = 'id', sortOrder = 'desc', filter } = options;

    const toPositiveInt = (value: number | undefined, fallback: number) => {
      if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
        return fallback;
      }
      const normalized = Math.trunc(value);
      return normalized > 0 ? normalized : fallback;
    };

    const safePage = toPositiveInt(page, 1);
    const safeLimit = toPositiveInt(limit, 10);
    const offset = (safePage - 1) * safeLimit;

    let whereClause = 'WHERE is_deleted = 0';
    const params: (string | number)[] = [];

    if (filter) {
      whereClause += ' AND email LIKE ?';
      params.push(`%${filter}%`);
    }

    const countStmt = this.db.prepare(`SELECT COUNT(*) as total FROM users_users ${whereClause}`);
    const countResult = await countStmt.bind(...params).first<{ total: number }>();
    const total = countResult?.total || 0;

    const sortColumnMap: Record<'id' | 'email' | 'createdAt', string> = {
      id: 'id',
      email: 'email',
      createdAt: 'created_at',
    };

    const sortColumnKey = sortBy && sortBy in sortColumnMap ? (sortBy as keyof typeof sortColumnMap) : 'id';
    const sortColumn = sortColumnMap[sortColumnKey];
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const dataStmt = this.db.prepare(
      `SELECT id, email, is_deleted, created_at FROM users_users ${whereClause} ORDER BY ${sortColumn} ${order} LIMIT ? OFFSET ?`
    );
    params.push(safeLimit, offset);

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

  async deleteUser(userId: number, updatedEmail: string): Promise<void> {
    const updateStmt = this.db.prepare('UPDATE users_users SET email = ?, is_deleted = 1 WHERE id = ?');
    await updateStmt.bind(updatedEmail, userId).run();

    const deleteGlobalRolesStmt = this.db.prepare('DELETE FROM users_user_global_roles WHERE user_id = ?');
    const deleteRangeRolesStmt = this.db.prepare('DELETE FROM users_user_range_roles WHERE user_id = ?');

    await deleteGlobalRolesStmt.bind(userId).run();
    await deleteRangeRolesStmt.bind(userId).run();
  }

  async getAdminContactProfile(userId: number): Promise<AdminContactProfileDto | null> {
    const stmt = this.db.prepare(
      `SELECT user_id, email, phone_number, display_name, is_hidden_globally
       FROM users_admin_contact_profiles
       WHERE user_id = ?`
    );
    const row = await stmt.bind(userId).first<{
      user_id: number;
      email: string | null;
      phone_number: string | null;
      display_name: string | null;
      is_hidden_globally: number;
    }>();

    if (!row) {
      return null;
    }

    return {
      userId: row.user_id,
      email: row.email ?? null,
      phoneNumber: row.phone_number ?? null,
      displayName: row.display_name ?? null,
      isHiddenGlobally: row.is_hidden_globally === 1,
    };
  }

  async upsertAdminContactProfile(profile: {
    userId: number;
    email: string | null;
    phoneNumber: string | null;
    displayName: string | null;
    isHiddenGlobally: boolean;
  }): Promise<AdminContactProfileDto> {
    const stmt = this.db.prepare(
      `INSERT INTO users_admin_contact_profiles
        (user_id, email, phone_number, display_name, is_hidden_globally)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         email = excluded.email,
         phone_number = excluded.phone_number,
         display_name = excluded.display_name,
         is_hidden_globally = excluded.is_hidden_globally,
         updated_at = CURRENT_TIMESTAMP
       RETURNING user_id, email, phone_number, display_name, is_hidden_globally`
    );

    const row = await stmt
      .bind(
        profile.userId,
        profile.email,
        profile.phoneNumber,
        profile.displayName,
        profile.isHiddenGlobally ? 1 : 0
      )
      .first<{
        user_id: number;
        email: string | null;
        phone_number: string | null;
        display_name: string | null;
        is_hidden_globally: number;
      }>();
    if (!row) {
      throw new Error('Failed to upsert admin contact profile');
    }

    return {
      userId: row.user_id,
      email: row.email ?? null,
      phoneNumber: row.phone_number ?? null,
      displayName: row.display_name ?? null,
      isHiddenGlobally: row.is_hidden_globally === 1,
    };
  }

  async getAdminContactProfileOverride(
    userId: number,
    rangeId: number
  ): Promise<AdminContactProfileOverrideDto | null> {
    const stmt = this.db.prepare(
      `SELECT user_id, range_id, email, phone_number, display_name, is_hidden_in_range
       FROM users_admin_contact_profile_overrides
       WHERE user_id = ? AND range_id = ?`
    );
    const row = await stmt.bind(userId, rangeId).first<{
      user_id: number;
      range_id: number;
      email: string | null;
      phone_number: string | null;
      display_name: string | null;
      is_hidden_in_range: number;
    }>();
    if (!row) {
      return null;
    }

    return {
      userId: row.user_id,
      rangeId: row.range_id,
      email: row.email ?? null,
      phoneNumber: row.phone_number ?? null,
      displayName: row.display_name ?? null,
      isHiddenInRange: row.is_hidden_in_range === 1,
    };
  }

  async upsertAdminContactProfileOverride(override: {
    userId: number;
    rangeId: number;
    email: string | null;
    phoneNumber: string | null;
    displayName: string | null;
    isHiddenInRange: boolean;
  }): Promise<AdminContactProfileOverrideDto> {
    const stmt = this.db.prepare(
      `INSERT INTO users_admin_contact_profile_overrides
        (user_id, range_id, email, phone_number, display_name, is_hidden_in_range)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, range_id) DO UPDATE SET
         email = excluded.email,
         phone_number = excluded.phone_number,
         display_name = excluded.display_name,
         is_hidden_in_range = excluded.is_hidden_in_range,
         updated_at = CURRENT_TIMESTAMP
       RETURNING user_id, range_id, email, phone_number, display_name, is_hidden_in_range`
    );

    const row = await stmt
      .bind(
        override.userId,
        override.rangeId,
        override.email,
        override.phoneNumber,
        override.displayName,
        override.isHiddenInRange ? 1 : 0
      )
      .first<{
        user_id: number;
        range_id: number;
        email: string | null;
        phone_number: string | null;
        display_name: string | null;
        is_hidden_in_range: number;
      }>();
    if (!row) {
      throw new Error('Failed to upsert admin contact profile override');
    }

    return {
      userId: row.user_id,
      rangeId: row.range_id,
      email: row.email ?? null,
      phoneNumber: row.phone_number ?? null,
      displayName: row.display_name ?? null,
      isHiddenInRange: row.is_hidden_in_range === 1,
    };
  }

  async getVisibleRangeAdminContacts(rangeId: number): Promise<Array<{
    userId: number;
    email: string | null;
    phoneNumber: string | null;
    displayName: string | null;
  }>> {
    const stmt = this.db.prepare(
      `SELECT
         u.id AS user_id,
         COALESCE(o.email, p.email, u.email) AS email,
         COALESCE(o.phone_number, p.phone_number, u.phone_number) AS phone_number,
         COALESCE(o.display_name, p.display_name, NULL) AS display_name
       FROM users_user_range_roles urr
       JOIN users_roles r ON r.id = urr.role_id
       JOIN users_users u ON u.id = urr.user_id
       LEFT JOIN users_admin_contact_profiles p ON p.user_id = u.id
       LEFT JOIN users_admin_contact_profile_overrides o
         ON o.user_id = u.id AND o.range_id = urr.range_id
       WHERE urr.range_id = ?
         AND u.is_deleted = 0
         AND r.name = 'Shooting Range Administrator'
         AND COALESCE(p.is_hidden_globally, 0) = 0
         AND COALESCE(o.is_hidden_in_range, 0) = 0
       GROUP BY u.id
       ORDER BY COALESCE(o.display_name, p.display_name, u.email) ASC`
    );

    const { results } = await stmt.bind(rangeId).all<{
      user_id: number;
      email: string | null;
      phone_number: string | null;
      display_name: string | null;
    }>();

    return (results ?? []).map((row) => ({
      userId: row.user_id,
      email: row.email ?? null,
      phoneNumber: row.phone_number ?? null,
      displayName: row.display_name ?? null,
    }));
  }
}
