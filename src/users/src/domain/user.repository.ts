import { GetUsersOptions, MeDto, Role, UserIdentifierDto } from '@strzel-sobie/common';
import { Result } from '@strzel-sobie/common';
import { User } from './user.model';

export interface IUserRepository {
  getById(id: number): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  add(user: User): Promise<User>;
  update(user: User): Promise<User>;
  findByEmail(email: string): Promise<UserIdentifierDto | null>;
  create(email: string): Promise<UserIdentifierDto>;
  getFullUserProfile(userId: number): Promise<MeDto | null>;
  getRoles(): Promise<Role[]>;
  findAndCount(
    options: GetUsersOptions
  ): Promise<{ users: User[]; total: number }>;
  assignGlobalRole(userId: number, roleId: number): Promise<void>;
  assignRangeRole(userId: number, roleId: number, rangeId: number): Promise<void>;
  removeGlobalRole(userId: number, roleId: number): Promise<void>;
  removeRangeRole(userId: number, roleId: number, rangeId: number): Promise<void>;
}
