import { AssignRoleCommand, RoleDto } from '../dto';
import { User } from '../models';
import { Result } from '../utils';
import { RoleNotFoundError, RoleScopeError, UserNotFoundError } from '../src/interfaces/errors';

export interface IUserService {
  getRoles(): Promise<Result<RoleDto[], Error>>;
  assignRoleToUser(command: {
    targetUserId: number;
    roleId: number;
    rangeId: number | null;
    requester: User;
  }): Promise<Result<void, UserNotFoundError | RoleNotFoundError | RoleScopeError>>;
}