import { describe, it, expect, vi, type Mocked } from 'vitest';
import {
  Result,
  UserNotFoundError,
  GetUsersOptions,
  IUserRepository,
  IAuditService,
  IRangesService,
  Role,
  User,
  UserRole,
} from '@strzel-sobie/common/models';
import { UserService } from '@strzel-sobie/users/src/application/user.service';
import type { IUserRepository } from '@strzel-sobie/users/src/domain/user.repository';

describe('UserService ↔ Ranges module integration', () => {
  it('verifies target range existence with the ranges module before assigning a range role', async () => {
    const ctx = createUserServiceContext();
    const requester = createUserDto(11, 'admin@example.com', [
      { id: 1, name: UserRole.ClubCommunityAdministrator, scope: 'global' },
    ]);
    const command = {
      targetUserId: 22,
      roleId: 5,
      rangeId: 17,
      requester,
    } as const;
    const requesterProfile = createProfile(requester.id, requester.email, ['Club/Community Administrator']);
    const targetProfile = createProfile(command.targetUserId, 'target@example.com', []);
    const rangeRole: Role = { id: command.roleId, name: 'Range Admin', scope: 'range' };

    ctx.userRepository.getFullUserProfile
      .mockResolvedValueOnce(requesterProfile)
      .mockResolvedValueOnce(targetProfile);
    ctx.userRepository.getRoles.mockResolvedValue([rangeRole]);
    ctx.rangesService.existsRangeById.mockResolvedValue(Result.ok(true));

    const result = await ctx.service.assignRoleToUser(command);

    expect(result.isSuccess).toBe(true);
    expect(ctx.rangesService.existsRangeById).toHaveBeenCalledWith(command.rangeId);
    expect(ctx.userRepository.assignRangeRole).toHaveBeenCalledWith(
      command.targetUserId,
      command.roleId,
      command.rangeId
    );
  });

  it('checks range presence through the ranges module before removing a range-bound role', async () => {
    const ctx = createUserServiceContext();
    const requester = createUserDto(7, 'owner@example.com', [
      { id: 1, name: UserRole.ClubCommunityAdministrator, scope: 'global' },
    ]);
    const command = {
      targetUserId: 33,
      roleId: 8,
      rangeId: 21,
      requester,
    } as const;
    const requesterProfile = createProfile(requester.id, requester.email, ['Club/Community Administrator']);
    const targetProfile = createProfile(command.targetUserId, 'range.user@example.com', []);
    const rangeRole: Role = { id: command.roleId, name: 'Training Supervisor', scope: 'range' };

    ctx.userRepository.getFullUserProfile
      .mockResolvedValueOnce(requesterProfile)
      .mockResolvedValueOnce(targetProfile);
    ctx.userRepository.getRoles.mockResolvedValue([rangeRole]);
    ctx.rangesService.existsRangeById.mockResolvedValue(Result.ok(true));

    const result = await ctx.service.removeRoleFromUser(command);

    expect(result.isSuccess).toBe(true);
    expect(ctx.rangesService.existsRangeById).toHaveBeenCalledWith(command.rangeId);
    expect(ctx.userRepository.removeRangeRole).toHaveBeenCalledWith(
      command.targetUserId,
      command.roleId,
      command.rangeId
    );
  });
});

function createUserServiceContext(): {
  userRepository: Mocked<IUserRepository>;
  rangesService: Mocked<IRangesService>;
  service: UserService;
} {
  const userRepository: Mocked<IUserRepository> = {
    getById: vi.fn(),
    getByEmail: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    getFullUserProfile: vi.fn(),
    getRoles: vi.fn(),
    findAndCount: vi.fn(),
    assignGlobalRole: vi.fn(),
    assignRangeRole: vi.fn(),
    removeGlobalRole: vi.fn(),
    removeRangeRole: vi.fn(),
  };

  const rangesService: Mocked<IRangesService> = {
    existsRangeById: vi.fn(),
    getRanges: vi.fn(),
    getRangeDetails: vi.fn(),
    updateRangeDetails: vi.fn(),
    getRangeIdBySlug: vi.fn(),
    deleteRange: vi.fn(),
  };

  const service = new UserService(userRepository, rangesService);

  return { userRepository, rangesService, service };
}

function createUserDto(id: number, email: string, roles: Role[]): UserDto {
  return {
    id,
    email,
    isDeleted: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    roles,
    rangeRoles: {},
  };
}

function createProfile(id: number, email: string, roleNames: string[]): MeDto {
  return {
    id,
    email,
    phoneNumber: null,
    roles: roleNames,
    rangeRoles: {},
  };
}
