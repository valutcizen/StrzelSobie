import { MeDto } from '../auth/dto';
import { GetUsersOptions, PaginatedUsersDto, UserDto, UserIdentifierDto } from './dto';
import { Result } from '../result';
import { User } from './model';
import { UserNotFoundError, RoleNotFoundError, RoleScopeError, ForbiddenError, RangeNotFoundError } from '../errors';
import { Role } from '../roles/model';


export interface IUserService {
  findUserByEmail(email:string): Promise<Result<UserIdentifierDto | null, Error>>;
  createUser(email: string): Promise<Result<UserIdentifierDto, Error>>;
  getFullUserProfile(userId: number): Promise<Result<MeDto | null, Error>>;
  getRoles(): Promise<Result<Role[], Error>>;
  getUserById(id: number): Promise<Result<User | null, Error>>; 
  getUsers(options: GetUsersOptions): Promise<Result<PaginatedUsersDto, Error>>; 
  assignRoleToUser(command: {
    targetUserId: number;
    roleId: number;
    rangeId: number | null;
    requester: UserDto;
  }): Promise<Result<void, UserNotFoundError | RoleNotFoundError | RoleScopeError | ForbiddenError | RangeNotFoundError>>;
  removeRoleFromUser(command: {
    targetUserId: number;
    roleId: number;
    rangeId: number | null;
    requester: UserDto;
  }): Promise<Result<void, UserNotFoundError | RoleNotFoundError | RoleScopeError | ForbiddenError | RangeNotFoundError>>;
}
