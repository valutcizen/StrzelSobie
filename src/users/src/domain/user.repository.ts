import { GetUsersOptions, MeDto, UserIdentifierDto } from '@strzel-sobie/common';
import { User, Role } from '@strzel-sobie/common/models';

export interface IUserRepository {
  getById(id: number): Promise<User | null>;
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
  deleteUser(userId: number, updatedEmail: string): Promise<void>;
}
