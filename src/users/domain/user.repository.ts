import { Result } from '../../common/utils/result';
import { User } from '../../common/models/users.models';
import { Role } from '../../common/models/roles.models';

export interface UserRepository {
  findById(id: string): Promise<Result<User, Error>>;
  findByEmail(email: string): Promise<Result<User, Error>>;
  create(user: User): Promise<Result<User, Error>>;
  findAllRoles(): Promise<Result<Role[], Error>>;
}
