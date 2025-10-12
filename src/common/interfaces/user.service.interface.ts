import { Result } from '../utils/result';
import { RoleDto } from '../dto';

export interface IUserService {
  getRoles(): Promise<Result<RoleDto[], Error>>;
}
