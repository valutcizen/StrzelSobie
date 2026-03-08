import {
  AdminContactProfileDto,
  AdminContactProfileOverrideDto,
  IUserService,
  UserNotFoundError,
  User,
  Role,
  IRangesService,
  ForbiddenError,
  RoleNotFoundError,
  RoleScopeError,
  RangeNotFoundError,
  IAuditService,
  UserRole,
} from '@strzel-sobie/common/models';
import {
  DeleteUserCommand,
  GetUsersOptions,
  MeDto,
  PaginatedUsersDto,
  Result,
  UpsertAdminContactProfileCommand,
  UpsertAdminContactProfileOverrideCommand,
  UserDto,
  UserIdentifierDto,
} from '@strzel-sobie/common';
import { IUserRepository } from '../domain/user.repository';

export class UserService implements IUserService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly rangesService: IRangesService,
    private readonly auditService: IAuditService
  ) {}

  async findUserByEmail(email: string): Promise<Result<UserIdentifierDto>> {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (user)
        return Result.ok(user);
      return Result.fail(new UserNotFoundError("User not found"));
    } catch (error) {
      return Result.fail(error as Error);
    }
  }
  async createUser(email: string): Promise<Result<UserIdentifierDto>> {
    try {
      const user = await this.userRepository.create(email);
      return Result.ok(user);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }
  async getFullUserProfile(userId: number): Promise<Result<MeDto>> {
    try {
      const profile = await this.userRepository.getFullUserProfile(userId);
      if (profile)
        return Result.ok(profile);
      return Result.fail(new UserNotFoundError("User not found"));
    } catch (error) {
      return Result.fail(error as Error);
    }
  }
  async getRoles(): Promise<Result<Role[]>> {
    try {
      const roles: Role[] = await this.userRepository.getRoles();
      return Result.ok(roles.map((role: Role) => ({ id: role.id, name: role.name, scope: role.scope })));
    } catch (error) {
      return Result.fail(error as Error);
    }
  }
  async getUserById(id: number): Promise<Result<User>> {
    try {
      const user = await this.userRepository.getById(id);
      if (user)
        return Result.ok(user);
      return Result.fail(new UserNotFoundError("User not found"));
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  public async getUsers(
    options: GetUsersOptions = {}
  ): Promise<Result<PaginatedUsersDto>> {
    try {
      const page = options.page && options.page > 0 ? Math.trunc(options.page) : 1;
      const limit = options.limit && options.limit > 0 ? Math.trunc(options.limit) : 10;
      const sortBy = options.sortBy ?? 'id';
      const sortOrder = options.sortOrder ?? 'desc';
      const filter = options.filter;

      const { users, total } = await this.userRepository.findAndCount({
        page,
        limit,
        sortBy,
        sortOrder,
        filter,
      });
      const userDtos: UserDto[] = await Promise.all(
        users.map(async (user: User) => {
          const profile = await this.userRepository.getFullUserProfile(user.id);
          const allRoles: Role[] = await this.userRepository.getRoles();
          const roleMap = new Map<string, Role>(allRoles.map((role: Role) => [role.name, role]));

          const rolesForUser = (profile?.roles ?? [])
            .map((roleName: string) => roleMap.get(roleName))
            .filter((role): role is Role => Boolean(role));

          const rangeRolesForUser = profile?.rangeRoles
            ? (Object.entries(profile.rangeRoles) as Array<[string, string[]]>).reduce<Record<string, Role[]>>(
                (acc, [rangeId, roleNames]) => {
                  acc[rangeId] = roleNames
                    .map((roleName: string) => roleMap.get(roleName))
                    .filter((role): role is Role => Boolean(role));
                  return acc;
                },
                {}
              )
            : {};

          return {
            id: user.id,
            email: user.email,
            isDeleted: user.is_deleted as 0 | 1,
            createdAt: user.created_at,
            roles: rolesForUser,
            rangeRoles: rangeRolesForUser,
          };
        })
      );

      return Result.ok({
        data: userDtos,
        pagination: {
          total,
          page,
          limit,
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
    requester: UserDto;
  }): Promise<Result<void>> {
    try {
      let { targetUserId, roleId, rangeId, requester } = command;

      if (rangeId === 0) {
        rangeId = null;
      }

      const requesterProfile = await this.userRepository.getFullUserProfile(requester.id);
      const requesterRoles = requesterProfile?.roles ?? [];
      const isAdmin = requesterRoles.includes('Club/Community Administrator');
      const isConfirmator = requesterRoles.includes('Confirmator');

      if (!isAdmin && !isConfirmator) {
        return Result.fail(new ForbiddenError('Forbidden'));
      }

      const targetUser = await this.userRepository.getFullUserProfile(targetUserId);
      if (!targetUser) {
        return Result.fail(new UserNotFoundError(`User with id ${targetUserId} not found`));
      }

      const roles: Role[] = await this.userRepository.getRoles();
      const roleToAssign = roles.find((role: Role) => role.id === roleId);

      if (!roleToAssign) {
        return Result.fail(new RoleNotFoundError(`Role with id ${roleId} not found`));
      }

      const canConfirmatorAssign =
        isConfirmator &&
        roleToAssign.scope === 'global' &&
        rangeId === null &&
        (roleToAssign.name === 'Member' || roleToAssign.name === 'Coordinator');

      if (!isAdmin && !canConfirmatorAssign) {
        return Result.fail(new ForbiddenError('Forbidden'));
      }

      if (roleToAssign.scope === 'global' && rangeId !== null) {
        return Result.fail(new RoleScopeError('Global roles cannot be assigned to a range.'));
      }

      if (roleToAssign.scope === 'range' && rangeId === null) {
        return Result.fail(new RoleScopeError('Range roles must be assigned to a range.'));
      }

      if (roleToAssign.scope === 'range') {
        const rangeResult = await this.rangesService.existsRangeById(rangeId as number);
        if (!rangeResult.isSuccess || !rangeResult.getValue()) {
          return Result.fail(new RangeNotFoundError(`Range with id ${rangeId} not found`));
        }
      }

      if (roleToAssign.scope === 'global') {
        await this.userRepository.assignGlobalRole(targetUserId, roleId);
      } else {
        await this.userRepository.assignRangeRole(targetUserId, roleId, rangeId as number);
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  async removeRoleFromUser(command: {
    targetUserId: number;
    roleId: number;
    rangeId: number | null;
    requester: UserDto;
  }): Promise<Result<void>> {
    try {
      let { targetUserId, roleId, rangeId, requester } = command;

      if (rangeId === 0) {
        rangeId = null;
      }

      const requesterProfile = await this.userRepository.getFullUserProfile(requester.id);
      const requesterRoles = requesterProfile?.roles ?? [];
      const isAdmin = requesterRoles.includes('Club/Community Administrator');
      const isConfirmator = requesterRoles.includes('Confirmator');

      if (!isAdmin && !isConfirmator) {
        return Result.fail(new ForbiddenError('Forbidden'));
      }

      const targetUser = await this.userRepository.getFullUserProfile(targetUserId);
      if (!targetUser) {
        return Result.fail(new UserNotFoundError(`User with id ${targetUserId} not found`));
      }

      const roles: Role[] = await this.userRepository.getRoles();
      const roleToRemove = roles.find((role: Role) => role.id === roleId);

      if (!roleToRemove) {
        return Result.fail(new RoleNotFoundError(`Role with id ${roleId} not found`));
      }

      const canConfirmatorRemove =
        isConfirmator &&
        roleToRemove.scope === 'global' &&
        rangeId === null &&
        (roleToRemove.name === 'Member' || roleToRemove.name === 'Coordinator');

      if (!isAdmin && !canConfirmatorRemove) {
        return Result.fail(new ForbiddenError('Forbidden'));
      }

      if (roleToRemove.scope === 'global' && rangeId !== null) {
        return Result.fail(new RoleScopeError('Global roles cannot be removed from a range.'))
      }

      if (roleToRemove.scope === 'range' && rangeId === null) {
        return Result.fail(new RoleScopeError('Range roles must be removed from a range.'))
      }

      if (roleToRemove.scope === 'range') {
        const rangeResult = await this.rangesService.existsRangeById(rangeId as number);
        if (!rangeResult.isSuccess || !rangeResult.getValue()) {
          return Result.fail(new RangeNotFoundError(`Range with id ${rangeId} not found`));
        }
      }

      if (roleToRemove.scope === 'global') {
        await this.userRepository.removeGlobalRole(targetUserId, roleId);
      } else {
        await this.userRepository.removeRangeRole(targetUserId, roleId, rangeId as number);
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  async deleteUser(command: DeleteUserCommand): Promise<Result<void>> {
    try {
      const { targetUserId, requester } = command;
      const requesterProfile = await this.userRepository.getFullUserProfile(requester.id);
      const requesterRoles = requesterProfile?.roles ?? [];
      const isAdmin = requesterRoles.includes('Club/Community Administrator');

      if (!isAdmin) {
        return Result.fail(new ForbiddenError('Forbidden'));
      }

      const user = await this.userRepository.getById(targetUserId);
      if (!user) {
        return Result.fail(new UserNotFoundError(`User with id ${targetUserId} not found`));
      }

      const timestamp = new Date().toISOString();
      const updatedEmail = `${user.email} ${timestamp}`;

      await this.userRepository.deleteUser(targetUserId, updatedEmail);

      const auditLogResult = await this.auditService.logAction({
        action_type: 'USER_DELETED',
        target_id: targetUserId,
        details: {
          previousEmail: user.email,
          updatedEmail,
          deletedBy: requester.id,
        },
      });

      if (!auditLogResult.isSuccess) {
        return Result.fail(auditLogResult.getError());
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  public async getVisibleRangeAdminContacts(
    rangeId: number,
    viewer: UserDto
  ): Promise<Result<Array<{ userId: number; email: string | null; phoneNumber: string | null; displayName: string | null }>>> {
    const canView = this.hasMemberOrHigher(viewer, rangeId);
    if (!canView) {
      return Result.fail(new ForbiddenError('User is not allowed to view administrator contacts'));
    }

    if (!this.userRepository.getVisibleRangeAdminContacts) {
      return Result.ok([]);
    }

    try {
      const contacts = await this.userRepository.getVisibleRangeAdminContacts(rangeId);
      return Result.ok(contacts);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  public async upsertAdminContactProfile(
    targetUserId: number,
    command: UpsertAdminContactProfileCommand,
    requester: UserDto
  ): Promise<Result<AdminContactProfileDto>> {
    const canManage = this.canManageOwnOrAdminProfile(targetUserId, requester);
    if (!canManage) {
      return Result.fail(new ForbiddenError('User is not allowed to manage this admin contact profile'));
    }
    if (!this.userRepository.upsertAdminContactProfile || !this.userRepository.getAdminContactProfile) {
      return Result.fail(new Error('Admin contact profiles repository is not configured'));
    }

    try {
      const current = await this.userRepository.getAdminContactProfile(targetUserId);
      const updated = await this.userRepository.upsertAdminContactProfile({
        userId: targetUserId,
        email: command.email !== undefined ? command.email : current?.email ?? null,
        phoneNumber:
          command.phoneNumber !== undefined ? command.phoneNumber : current?.phoneNumber ?? null,
        displayName:
          command.displayName !== undefined ? command.displayName : current?.displayName ?? null,
        isHiddenGlobally:
          command.isHiddenGlobally !== undefined
            ? command.isHiddenGlobally
            : current?.isHiddenGlobally ?? false,
      });
      return Result.ok(updated);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  public async upsertAdminContactProfileOverride(
    targetUserId: number,
    command: UpsertAdminContactProfileOverrideCommand,
    requester: UserDto
  ): Promise<Result<AdminContactProfileOverrideDto>> {
    const canManage = this.canManageOwnOrAdminProfile(targetUserId, requester);
    if (!canManage) {
      return Result.fail(new ForbiddenError('User is not allowed to manage this admin contact override'));
    }
    if (
      !this.userRepository.upsertAdminContactProfileOverride ||
      !this.userRepository.getAdminContactProfileOverride
    ) {
      return Result.fail(new Error('Admin contact overrides repository is not configured'));
    }

    try {
      const current = await this.userRepository.getAdminContactProfileOverride(
        targetUserId,
        command.rangeId
      );
      const updated = await this.userRepository.upsertAdminContactProfileOverride({
        userId: targetUserId,
        rangeId: command.rangeId,
        email: command.email !== undefined ? command.email : current?.email ?? null,
        phoneNumber:
          command.phoneNumber !== undefined ? command.phoneNumber : current?.phoneNumber ?? null,
        displayName:
          command.displayName !== undefined ? command.displayName : current?.displayName ?? null,
        isHiddenInRange:
          command.isHiddenInRange !== undefined
            ? command.isHiddenInRange
            : current?.isHiddenInRange ?? false,
      });
      return Result.ok(updated);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  private hasMemberOrHigher(user: UserDto, rangeId: number): boolean {
    const globalRoles = new Set(user.roles.map((role) => role.name));
    if (
      globalRoles.has(UserRole.Member) ||
      globalRoles.has(UserRole.Coordinator) ||
      globalRoles.has(UserRole.Confirmator) ||
      globalRoles.has(UserRole.ClubCommunityAdministrator)
    ) {
      return true;
    }

    const rangeRoles = user.rangeRoles[String(rangeId)] ?? [];
    return rangeRoles.some((role) =>
      [UserRole.Member, UserRole.Coordinator, UserRole.ShootingRangeAdministrator].includes(
        role.name as UserRole
      )
    );
  }

  private canManageOwnOrAdminProfile(targetUserId: number, requester: UserDto): boolean {
    if (targetUserId === requester.id) {
      return true;
    }

    const globalRoles = new Set(requester.roles.map((role) => role.name));
    return globalRoles.has(UserRole.ClubCommunityAdministrator);
  }
}
