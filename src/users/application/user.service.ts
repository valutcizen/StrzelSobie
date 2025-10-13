import { IUserService, MeDto, Result, RoleDto, User, UserIdentifierDto } from '@strzel-sobie/common';
import { UserRepository } from '../domain/user.repository';

export class UserService implements IUserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findUserByEmail(email: string): Promise<Result<User, Error>> {
    try {
      const user = await this.userRepository.findByEmail(email);
      return user;
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  async createUser(email: string): Promise<Result<UserIdentifierDto, Error>> {
    try {
      const user = await this.userRepository.create(email);
      return Result.ok(user);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  async getFullUserProfile(userId: number): Promise<Result<MeDto | null, Error>> {
    try {
      const profile = await this.userRepository.getFullUserProfile(userId);
      return Result.ok(profile);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  async getRoles(): Promise<Result<RoleDto[], Error>> {
    try {
      const roles = await this.userRepository.getRoles();
      return Result.ok(roles);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }
}
