import { IUserRepository } from '../domain/user.repository';
import { IDatabase, MeDto, UserIdentifierDto } from '@strzel-sobie/common';

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
      JOIN admin_shooting_ranges sr ON urr.range_id = sr.id
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
}
