import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from './user.service';
import { IUserRepository } from '../domain/user.repository';
import { IAdminService, Result, User, ForbiddenError, UserNotFoundError, RoleNotFoundError, RoleScopeError, RangeNotFoundError, MeDto } from '@strzel-sobie/common';

describe('UserService', () => {
  let userService: UserService;
  let userRepository: IUserRepository;
  let adminService: IAdminService;

  const requester: User = { id: 1, email: 'admin@test.com' } as User;
  const regularUser: User = { id: 2, email: 'user@test.com' } as User;
  const requesterProfile: MeDto = { id: 1, email: 'admin@test.com', roles: ['Club/Community Administrator'], rangeRoles: {}, phoneNumber: null };
  const regularUserProfile: MeDto = { id: 2, email: 'user@test.com', roles: [], rangeRoles: {}, phoneNumber: null };

  beforeEach(() => {
    userRepository = {
      getFullUserProfile: vi.fn(),
      getRoles: vi.fn(),
      assignGlobalRole: vi.fn(),
      assignRangeRole: vi.fn(),
    } as any;

    adminService = {
      getRangeById: vi.fn(),
    } as any;

    userService = new UserService(userRepository, adminService);
  });

  describe('assignRoleToUser', () => {
    it('should return ForbiddenError if requester is not an admin', async () => {
      vi.spyOn(userRepository, 'getFullUserProfile').mockResolvedValueOnce(regularUserProfile);

      const result = await userService.assignRoleToUser({ targetUserId: 3, roleId: 1, rangeId: null, requester: regularUser });

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(ForbiddenError);
    });

    it('should return UserNotFoundError if target user does not exist', async () => {
      vi.spyOn(userRepository, 'getFullUserProfile').mockResolvedValueOnce(requesterProfile);
      vi.spyOn(userRepository, 'getFullUserProfile').mockResolvedValueOnce(null);

      const result = await userService.assignRoleToUser({ targetUserId: 3, roleId: 1, rangeId: null, requester });

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(UserNotFoundError);
    });

    it('should return RoleNotFoundError if role does not exist', async () => {
      vi.spyOn(userRepository, 'getFullUserProfile').mockResolvedValue(requesterProfile);
      vi.spyOn(userRepository, 'getRoles').mockResolvedValue([]);

      const result = await userService.assignRoleToUser({ targetUserId: 3, roleId: 99, rangeId: null, requester });

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(RoleNotFoundError);
    });

    it('should return RoleScopeError if global role is assigned with a rangeId', async () => {
      vi.spyOn(userRepository, 'getFullUserProfile').mockResolvedValue(requesterProfile);
      vi.spyOn(userRepository, 'getRoles').mockResolvedValue([{ id: 1, name: 'Global Role', scope: 'global' }]);

      const result = await userService.assignRoleToUser({ targetUserId: 3, roleId: 1, rangeId: 1, requester });

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(RoleScopeError);
    });

    it('should return RoleScopeError if range role is assigned without a rangeId', async () => {
      vi.spyOn(userRepository, 'getFullUserProfile').mockResolvedValue(requesterProfile);
      vi.spyOn(userRepository, 'getRoles').mockResolvedValue([{ id: 1, name: 'Range Role', scope: 'range' }]);

      const result = await userService.assignRoleToUser({ targetUserId: 3, roleId: 1, rangeId: null, requester });

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(RoleScopeError);
    });

    it('should return RangeNotFoundError if range does not exist for a range role', async () => {
      vi.spyOn(userRepository, 'getFullUserProfile').mockResolvedValue(requesterProfile);
      vi.spyOn(userRepository, 'getRoles').mockResolvedValue([{ id: 1, name: 'Range Role', scope: 'range' }]);
      vi.spyOn(adminService, 'getRangeById').mockResolvedValue(Result.ok(null));

      const result = await userService.assignRoleToUser({ targetUserId: 3, roleId: 1, rangeId: 99, requester });

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(RangeNotFoundError);
    });

    it('should assign a global role successfully', async () => {
      vi.spyOn(userRepository, 'getFullUserProfile').mockResolvedValue(requesterProfile);
      vi.spyOn(userRepository, 'getRoles').mockResolvedValue([{ id: 1, name: 'Global Role', scope: 'global' }]);
      vi.spyOn(userRepository, 'assignGlobalRole').mockResolvedValue(undefined);

      const result = await userService.assignRoleToUser({ targetUserId: 3, roleId: 1, rangeId: null, requester });

      expect(result.isSuccess).toBe(true);
      expect(userRepository.assignGlobalRole).toHaveBeenCalledWith(3, 1);
    });

    it('should assign a range role successfully', async () => {
      vi.spyOn(userRepository, 'getFullUserProfile').mockResolvedValue(requesterProfile);
      vi.spyOn(userRepository, 'getRoles').mockResolvedValue([{ id: 1, name: 'Range Role', scope: 'range' }]);
      vi.spyOn(adminService, 'getRangeById').mockResolvedValue(Result.ok({ id: 1 }));
      vi.spyOn(userRepository, 'assignRangeRole').mockResolvedValue(undefined);

      const result = await userService.assignRoleToUser({ targetUserId: 3, roleId: 1, rangeId: 1, requester });

      expect(result.isSuccess).toBe(true);
      expect(userRepository.assignRangeRole).toHaveBeenCalledWith(3, 1, 1);
    });
  });
});
