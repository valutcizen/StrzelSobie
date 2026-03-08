import { MeDto } from '../auth/dto';
import { Role } from '../auth/model';
import {
  AdminContactProfileDto,
  AdminContactProfileOverrideDto,
  DeleteUserCommand,
  GetUsersOptions,
  PaginatedUsersDto,
  UpsertAdminContactProfileCommand,
  UpsertAdminContactProfileOverrideCommand,
  UserDto,
  UserIdentifierDto,
} from './dto';
import { Result } from '../result';
import { User } from './model';


export interface IUserService {
  findUserByEmail(email:string): Promise<Result<UserIdentifierDto>>;
  createUser(email: string): Promise<Result<UserIdentifierDto>>;
  getFullUserProfile(userId: number): Promise<Result<MeDto>>;
  getRoles(): Promise<Result<Role[]>>;
  getUserById(id: number): Promise<Result<User>>; 
  getUsers(options: GetUsersOptions): Promise<Result<PaginatedUsersDto>>; 
  assignRoleToUser(command: {
    targetUserId: number;
    roleId: number;
    rangeId: number | null;
    requester: UserDto;
  }): Promise<Result<void>>;
  removeRoleFromUser(command: {
    targetUserId: number;
    roleId: number;
    rangeId: number | null;
    requester: UserDto;
  }): Promise<Result<void>>;
  deleteUser(command: DeleteUserCommand): Promise<Result<void>>;
  getVisibleRangeAdminContacts(
    rangeId: number,
    viewer: UserDto
  ): Promise<
    Result<Array<{ userId: number; email: string | null; phoneNumber: string | null; displayName: string | null }>>
  >;
  upsertAdminContactProfile(
    targetUserId: number,
    command: UpsertAdminContactProfileCommand,
    requester: UserDto
  ): Promise<Result<AdminContactProfileDto>>;
  upsertAdminContactProfileOverride(
    targetUserId: number,
    command: UpsertAdminContactProfileOverrideCommand,
    requester: UserDto
  ): Promise<Result<AdminContactProfileOverrideDto>>;
}
