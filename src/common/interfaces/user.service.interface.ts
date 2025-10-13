import { RoleDto } from '../dto/roles.dto';
import { Result } from '../src/utils/result';

export interface IUserService {
  getRoles(): Promise<Result<RoleDto[], Error>>;
}