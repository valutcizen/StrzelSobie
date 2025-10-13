import { IUserService, Result, PaginatedUsersDto, GetUsersOptions, UserDto, UserIdentifierDto, MeDto, RoleDto, User, AssignRoleCommand, RoleScopeError, UserNotFoundError, RoleNotFoundError } from '@strzel-sobie/common';
import { IUserRepository } from '../domain/user.repository';

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

  async assignRoleToUser(command: {
    targetUserId: number;
    roleId: number;
    rangeId: number | null;
    requester: User;
  }): Promise<Result<void, UserNotFoundError | RoleNotFoundError | RoleScopeError>> {
    try {
      const { targetUserId, roleId, rangeId, requester } = command;

      const requesterProfile = await this.userRepository.getFullUserProfile(requester.id);

      const isAdmin = requesterProfile?.roles.includes('Club Admin');
      if (!isAdmin) {
        return Result.fail(new Error('Forbidden'));
      }

      const targetUser = await this.userRepository.getFullUserProfile(targetUserId);
      if (!targetUser) {
        return Result.fail(new UserNotFoundError(`User with id ${targetUserId} not found`));
      }

      const roles = await this.userRepository.getRoles();
      const roleToAssign = roles.find(role => role.id === roleId);

      if (!roleToAssign) {
        return Result.fail(new RoleNotFoundError(`Role with id ${roleId} not found`));
      }

      if (roleToAssign.scope === 'global' && rangeId !== null) {
        return Result.fail(new RoleScopeError('Global roles cannot be assigned to a range.'));
      }

      if (roleToAssign.scope === 'range' && rangeId === null) {
        return Result.fail(new RoleScopeError('Range roles must be assigned to a range.'));
      }

      if (roleToAssign.scope === 'global') {
        await this.userRepository.assignGlobalRole(targetUserId, roleId);
      } else {
        // TODO: Validate rangeId exists in the database
        await this.userRepository.assignRangeRole(targetUserId, roleId, rangeId as number);
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }
}
