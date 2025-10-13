import { IUserService, Result, PaginatedUsersDto, GetUsersOptions, UserDto, UserIdentifierDto, MeDto, RoleDto } from '@strzel-sobie/common';
import { IUserRepository } from '../domain/user.repository';
import { User } from '../domain/user.model';

export class UserService implements IUserService {
  constructor(private readonly userRepository: IUserRepository) {}

  async findUserByEmail(email: string): Promise<Result<UserIdentifierDto | null, Error>> {
    try {
      const user = await this.userRepository.findByEmail(email);
      return Result.ok(user);
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
      return Result.ok(roles.map(role => ({ id: role.id, name: role.name, scope: role.scope })));
    } catch (error) {
      return Result.fail(error as Error);
    }
  }
  async getUserById(id: string): Promise<Result<User | null, Error>> {
    try {
      const user = await this.userRepository.getById(id);
      return Result.ok(user);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  public async getUsers(
    options: GetUsersOptions = {}
  ): Promise<Result<PaginatedUsersDto, Error>> {
    try {
      const { users, total } = await this.userRepository.findAndCount(options);

      const userDtos: UserDto[] = users.map((user) => ({
        id: user.id,
        email: user.email,
        isDeleted: user.is_deleted as 0 | 1,
        createdAt: user.created_at,
      }));

      return Result.ok({
        data: userDtos,
        pagination: {
          total,
          page: options.page || 1,
          limit: options.limit || 10,
        },
      });
    } catch (error) {
      return Result.fail(error as Error);
    }
  }
}
