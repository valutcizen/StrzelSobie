import { MeDto } from '../auth/dto';
import { RoleDto } from '../roles/dto';
import { GetUsersOptions, PaginatedUsersDto, UserIdentifierDto } from './dto';
import { Result } from '../result';
import { User } from './model';
import { UserNotFoundError, RoleNotFoundError, RoleScopeError, ForbiddenError, RangeNotFoundError } from '../errors';


export interface IUserService {
  findUserByEmail(email:string): Promise<Result<UserIdentifierDto | null, Error>>;
  createUser(email: string): Promise<Result<UserIdentifierDto, Error>>;
  getFullUserProfile(userId: number): Promise<Result<MeDto | null, Error>>;
  getRoles(): Promise<Result<RoleDto[], Error>>;
  getUserById(id: string): Promise<Result<User | null, Error>>; 
  getUsers(options: GetUsersOptions): Promise<Result<PaginatedUsersDto, Error>>; 
  assignRoleToUser(command: {
    targetUserId: number;
    roleId: number;
    rangeId: number | null;
    requester: User;
  }): Promise<Result<void, UserNotFoundError | RoleNotFoundError | RoleScopeError | ForbiddenError | RangeNotFoundError>>;
  removeRoleFromUser(command: {
    targetUserId: number;
    roleId: number;
    rangeId: number | null;
    requester: User;
  }): Promise<Result<void, UserNotFoundError | RoleNotFoundError | RoleScopeError | ForbiddenError | RangeNotFoundError>>;
}
