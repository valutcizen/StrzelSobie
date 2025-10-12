import { UserIdentifierDto } from '../dto';

export interface IUserService {
  findUserByEmail(email: string): Promise<UserIdentifierDto | null>;
  createUser(email: string): Promise<UserIdentifierDto>;
}
