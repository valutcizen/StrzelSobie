import { MeDto, RoleDto, UserIdentifierDto } from '../dto';
import { Result } from '../utils/result';

export interface IUserService {
  findUserByEmail(email:string): Promise<Result<UserIdentifierDto | null, Error>>;
  createUser(email: string): Promise<Result<UserIdentifierDto, Error>>;
  getFullUserProfile(userId: number): Promise<Result<MeDto | null, Error>>;
  getRoles(): Promise<Result<RoleDto[], Error>>;
}
