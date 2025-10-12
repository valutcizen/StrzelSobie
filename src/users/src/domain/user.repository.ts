import { UserIdentifierDto } from '@strzel-sobie/common';

export interface IUserRepository {
  findByEmail(email: string): Promise<UserIdentifierDto | null>;
  create(email: string): Promise<UserIdentifierDto>;
}
