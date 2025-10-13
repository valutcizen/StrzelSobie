import { MeDto, RoleDto, UserIdentifierDto } from '../dto';
import { GetUsersOptions, PaginatedUsersDto } from '../dto';
import { Result } from '../utils/result';
import { User } from '../models/users.models';

export interface IUserService {
  findUserByEmail(email:string): Promise<Result<UserIdentifierDto | null, Error>>;
  createUser(email: string): Promise<Result<UserIdentifierDto, Error>>;
  getFullUserProfile(userId: number): Promise<Result<MeDto | null, Error>>;
  getRoles(): Promise<Result<RoleDto[], Error>>;
  getUserById(id: string): Promise<Result<User | null, Error>>; 
  getUsers(options: GetUsersOptions): Promise<Result<PaginatedUsersDto, Error>>; 
}
