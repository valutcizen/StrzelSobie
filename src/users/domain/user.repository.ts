import { Result, User, Role } from '@strzel-sobie/common';

export interface UserRepository {
  findById(id: string): Promise<Result<User, Error>>;
  findByEmail(email: string): Promise<Result<User, Error>>;
  create(user: User): Promise<Result<User, Error>>;
  findAllRoles(): Promise<Result<Role[], Error>>;
}