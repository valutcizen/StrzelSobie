import { IUserService, Result, MeDto, UserIdentifierDto, RoleDto } from '@strzel-sobie/common';
import { IUserRepository } from '../domain/user.repository';

export class UserService implements IUserService {
  constructor(private readonly userRepository: IUserRepository) {}

  async findUserByEmail(email: string): Promise<Result<UserIdentifierDto | null, Error>> {
    const user = await this.userRepository.findByEmail(email);
    return Result.ok(user);
  }

  async createUser(email: string): Promise<Result<UserIdentifierDto, Error>> {
    const createdUser = await this.userRepository.create(email);
    return Result.ok(createdUser);
  }

  async getFullUserProfile(userId: number): Promise<Result<MeDto | null, Error>> {
    const userProfile = await this.userRepository.getFullUserProfile(userId);
    return Result.ok(userProfile);
  }

  async getRoles(): Promise<Result<RoleDto[], Error>> {
    const roles = await this.userRepository.getRoles();
    return Result.ok(roles);
  }
}
