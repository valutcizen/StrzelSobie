import { User } from './user.entity';

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  create(email: string): Promise<User>;
}
