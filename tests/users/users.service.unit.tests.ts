import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserService } from '@strzel-sobie/users/src/application/user.service';
import type { IUserRepository } from '@strzel-sobie/users/src/domain/user.repository';
import type { IRangesService, MeDto, Role, UserDto, User as UserModel } from '@strzel-sobie/common/models';
import {
  Result,
  UserNotFoundError,
  GetUsersOptions,
  IUserRepository,
  IAuditService,
  ForbiddenError,
  RoleNotFoundError,
  RoleScopeError,
  RangeNotFoundError,
} from '@strzel-sobie/common/models';

type MockedRepository = {
  [K in keyof IUserRepository]: ReturnType<typeof vi.fn<IUserRepository[K]>>;
};

type MockedRangesService = {
  [K in keyof IRangesService]: ReturnType<typeof vi.fn<IRangesService[K]>>;
};

const adminRoleName = 'Club/Community Administrator';

const makeUserModel = (overrides: Partial<UserModel> = {}): UserModel => ({
  id: 1,
  email: 'user@example.com',
  phone_number: null,
  is_deleted: 0,
  created_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const makeProfile = (overrides: Partial<MeDto> = {}): MeDto => ({
  id: 1,
  email: 'profile@example.com',
  phoneNumber: null,
  roles: [] as string[],
  rangeRoles: {} as Record<string, string[]>,
  ...overrides,
});

const makeUserDto = (overrides: Partial<UserDto> = {}): UserDto => ({
  id: 1,
  email: 'dto@example.com',
  isDeleted: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  roles: [] as Role[],
  rangeRoles: {} as Record<string, Role[]>,
  ...overrides,
});

const makeRole = (overrides: Partial<Role> = {}): Role => ({
  id: 1,
  name: 'Role',
  scope: 'global',
  ...overrides,
});

const createTestContext = () => {
  const userRepository: MockedRepository = {
    findByEmail: vi.fn<IUserRepository['findByEmail']>(),
    create: vi.fn<IUserRepository['create']>(),
    getFullUserProfile: vi.fn<IUserRepository['getFullUserProfile']>(),
    getRoles: vi.fn<IUserRepository['getRoles']>(),
    getById: vi.fn<IUserRepository['getById']>(),
    findAndCount: vi.fn<IUserRepository['findAndCount']>(),
    assignGlobalRole: vi.fn<IUserRepository['assignGlobalRole']>(),
    assignRangeRole: vi.fn<IUserRepository['assignRangeRole']>(),
    removeGlobalRole: vi.fn<IUserRepository['removeGlobalRole']>(),
    removeRangeRole: vi.fn<IUserRepository['removeRangeRole']>(),
    getByEmail: vi.fn<IUserRepository['getByEmail']>(),
    add: vi.fn<IUserRepository['add']>(),
    update: vi.fn<IUserRepository['update']>(),
  };

  const rangesService: MockedRangesService = {
    existsRangeById: vi.fn<IRangesService['existsRangeById']>(),
    getRanges: vi.fn<IRangesService['getRanges']>(),
    getRangeDetails: vi.fn<IRangesService['getRangeDetails']>(),
    updateRangeDetails: vi.fn<IRangesService['updateRangeDetails']>(),
    getRangeIdBySlug: vi.fn<IRangesService['getRangeIdBySlug']>(),
  };

  const service = new UserService(
    userRepository as unknown as IUserRepository,
    rangesService as unknown as IRangesService
  );

  return { service, userRepository, rangesService };
};

describe('UserService contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('findUserByEmail', () => {
    it('returns the found user', async () => {
      const { service, userRepository } = createTestContext();
      const identifier = { id: 7, email: 'someone@example.com' };
      userRepository.findByEmail.mockResolvedValue(identifier);

      const result = await service.findUserByEmail(identifier.email);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual(identifier);
      expect(userRepository.findByEmail).toHaveBeenCalledWith(identifier.email);
    });

    it('fails when the user cannot be found', async () => {
      const { service, userRepository } = createTestContext();
      userRepository.findByEmail.mockResolvedValue(null);

      const result = await service.findUserByEmail('missing@example.com');

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(UserNotFoundError);
    });

    it('fails when the repository rejects', async () => {
      const { service, userRepository } = createTestContext();
      const failure = new Error('database down');
      userRepository.findByEmail.mockRejectedValue(failure);

      const result = await service.findUserByEmail('error@example.com');

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBe(failure);
    });
  });

  describe('createUser', () => {
    it('creates and returns the new user identifier', async () => {
      const { service, userRepository } = createTestContext();
      const identifier = { id: 5, email: 'new@example.com' };
      userRepository.create.mockResolvedValue(identifier);

      const result = await service.createUser(identifier.email);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual(identifier);
      expect(userRepository.create).toHaveBeenCalledWith(identifier.email);
    });

    it('fails when creating the user throws', async () => {
      const { service, userRepository } = createTestContext();
      const failure = new Error('duplicate key');
      userRepository.create.mockRejectedValue(failure);

      const result = await service.createUser('new@example.com');

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBe(failure);
    });
  });

  describe('getFullUserProfile', () => {
    it('returns the full profile when it exists', async () => {
      const { service, userRepository } = createTestContext();
      const profile = makeProfile({ id: 2 });
      userRepository.getFullUserProfile.mockResolvedValue(profile);

      const result = await service.getFullUserProfile(profile.id);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual(profile);
      expect(userRepository.getFullUserProfile).toHaveBeenCalledWith(profile.id);
    });

    it('fails when the profile does not exist', async () => {
      const { service, userRepository } = createTestContext();
      userRepository.getFullUserProfile.mockResolvedValue(null);

      const result = await service.getFullUserProfile(123);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(UserNotFoundError);
    });

    it('fails when the repository rejects', async () => {
      const { service, userRepository } = createTestContext();
      const failure = new Error('timeout');
      userRepository.getFullUserProfile.mockRejectedValue(failure);

      const result = await service.getFullUserProfile(321);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBe(failure);
    });
  });

  describe('getRoles', () => {
    it('returns the mapped roles', async () => {
      const { service, userRepository } = createTestContext();
      const roles = [
        makeRole({ id: 1, name: adminRoleName, scope: 'global' }),
        makeRole({ id: 2, name: 'Range Officer', scope: 'range' }),
      ];
      userRepository.getRoles.mockResolvedValue(roles);

      const result = await service.getRoles();

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual(roles);
    });

    it('fails when fetching roles throws', async () => {
      const { service, userRepository } = createTestContext();
      const failure = new Error('roles unavailable');
      userRepository.getRoles.mockRejectedValue(failure);

      const result = await service.getRoles();

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBe(failure);
    });
  });

  describe('getUserById', () => {
    it('returns the user when it exists', async () => {
      const { service, userRepository } = createTestContext();
      const user = makeUserModel({ id: 55 });
      userRepository.getById.mockResolvedValue(user);

      const result = await service.getUserById(user.id);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual(user);
      expect(userRepository.getById).toHaveBeenCalledWith(user.id);
    });

    it('fails when the user does not exist', async () => {
      const { service, userRepository } = createTestContext();
      userRepository.getById.mockResolvedValue(null);

      const result = await service.getUserById(404);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(UserNotFoundError);
    });

    it('fails when fetching the user rejects', async () => {
      const { service, userRepository } = createTestContext();
      const failure = new Error('db offline');
      userRepository.getById.mockRejectedValue(failure);

      const result = await service.getUserById(77);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBe(failure);
    });
  });

  describe('getUsers', () => {
    it('maps repository users, profiles, and roles', async () => {
      const { service, userRepository } = createTestContext();
      const users = [
        makeUserModel({ id: 1, email: 'admin@example.com', is_deleted: 0 }),
        makeUserModel({ id: 2, email: 'member@example.com', is_deleted: 1 }),
      ];
      userRepository.findAndCount.mockResolvedValue({ users, total: 2 });

      const allRoles = [
        makeRole({ id: 1, name: adminRoleName, scope: 'global' }),
        makeRole({ id: 2, name: 'Range Officer', scope: 'range' }),
      ];
      userRepository.getRoles.mockResolvedValue(allRoles);

      const adminProfile = makeProfile({
        id: 1,
        email: 'admin@example.com',
        roles: [adminRoleName, 'Unknown'],
        rangeRoles: { '7': ['Range Officer', 'Missing'] },
      });

      userRepository.getFullUserProfile
        .mockResolvedValueOnce(adminProfile)
        .mockResolvedValueOnce(null);

      const result = await service.getUsers({});

      expect(result.isSuccess).toBe(true);
      const payload = result.getValue();
      expect(payload).toEqual({
        data: [
          {
            id: 1,
            email: 'admin@example.com',
            isDeleted: 0,
            createdAt: users[0].created_at,
            roles: [allRoles[0]],
            rangeRoles: { '7': [allRoles[1]] },
          },
          {
            id: 2,
            email: 'member@example.com',
            isDeleted: 1,
            createdAt: users[1].created_at,
            roles: [],
            rangeRoles: {},
          },
        ],
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
        },
      });

      expect(userRepository.getFullUserProfile).toHaveBeenCalledTimes(2);
      expect(userRepository.getRoles).toHaveBeenCalledTimes(2);
    });

    it('propagates repository errors', async () => {
      const { service, userRepository } = createTestContext();
      const failure = new Error('cannot list users');
      userRepository.findAndCount.mockRejectedValue(failure);

      const result = await service.getUsers({});

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBe(failure);
    });
  });

  describe('assignRoleToUser', () => {
    const requester = makeUserDto({ id: 10 });
    const adminProfile = makeProfile({
      id: requester.id,
      roles: [adminRoleName],
    });
    const targetProfile = makeProfile({ id: 20 });
    const globalRole = makeRole({ id: 1, name: adminRoleName, scope: 'global' });
    const rangeRole = makeRole({ id: 2, name: 'Range Officer', scope: 'range' });

    it('fails when the requester is not an administrator', async () => {
      const { service, userRepository } = createTestContext();
      userRepository.getFullUserProfile.mockResolvedValue(makeProfile({ roles: [] }));

      const result = await service.assignRoleToUser({
        targetUserId: 20,
        roleId: 1,
        rangeId: null,
        requester,
      });

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(ForbiddenError);
    });

    it('fails when the target user does not exist', async () => {
      const { service, userRepository } = createTestContext();
      userRepository.getFullUserProfile
        .mockResolvedValueOnce(adminProfile)
        .mockResolvedValueOnce(null);

      const result = await service.assignRoleToUser({
        targetUserId: 99,
        roleId: 1,
        rangeId: null,
        requester,
      });

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(UserNotFoundError);
    });

    it('fails when the role does not exist', async () => {
      const { service, userRepository } = createTestContext();
      userRepository.getFullUserProfile
        .mockResolvedValueOnce(adminProfile)
        .mockResolvedValueOnce(targetProfile);
      userRepository.getRoles.mockResolvedValue([globalRole]);

      const result = await service.assignRoleToUser({
        targetUserId: targetProfile.id,
        roleId: 999,
        rangeId: null,
        requester,
      });

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(RoleNotFoundError);
    });

    it('fails when a global role is assigned with a range id', async () => {
      const { service, userRepository } = createTestContext();
      userRepository.getFullUserProfile
        .mockResolvedValueOnce(adminProfile)
        .mockResolvedValueOnce(targetProfile);
      userRepository.getRoles.mockResolvedValue([globalRole]);

      const result = await service.assignRoleToUser({
        targetUserId: targetProfile.id,
        roleId: globalRole.id,
        rangeId: 5,
        requester,
      });

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(RoleScopeError);
    });

    it('fails when a range role is assigned without a range id', async () => {
      const { service, userRepository } = createTestContext();
      userRepository.getFullUserProfile
        .mockResolvedValueOnce(adminProfile)
        .mockResolvedValueOnce(targetProfile);
      userRepository.getRoles.mockResolvedValue([rangeRole]);

      const result = await service.assignRoleToUser({
        targetUserId: targetProfile.id,
        roleId: rangeRole.id,
        rangeId: null,
        requester,
      });

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(RoleScopeError);
    });

    it('fails when the range does not exist for a range role', async () => {
      const { service, userRepository, rangesService } = createTestContext();
      userRepository.getFullUserProfile
        .mockResolvedValueOnce(adminProfile)
        .mockResolvedValueOnce(targetProfile);
      userRepository.getRoles.mockResolvedValue([rangeRole]);
      rangesService.existsRangeById.mockResolvedValue(Result.ok(false));

      const result = await service.assignRoleToUser({
        targetUserId: targetProfile.id,
        roleId: rangeRole.id,
        rangeId: 42,
        requester,
      });

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(RangeNotFoundError);
    });

    it('assigns a global role when all checks pass and normalizes rangeId=0', async () => {
      const { service, userRepository } = createTestContext();
      userRepository.getFullUserProfile
        .mockResolvedValueOnce(adminProfile)
        .mockResolvedValueOnce(targetProfile);
      userRepository.getRoles.mockResolvedValue([globalRole]);
      userRepository.assignGlobalRole.mockResolvedValue();

      const result = await service.assignRoleToUser({
        targetUserId: targetProfile.id,
        roleId: globalRole.id,
        rangeId: 0,
        requester,
      });

      expect(result.isSuccess).toBe(true);
      expect(userRepository.assignGlobalRole).toHaveBeenCalledWith(
        targetProfile.id,
        globalRole.id
      );
      expect(userRepository.assignRangeRole).not.toHaveBeenCalled();
    });

    it('assigns a range role when the range exists', async () => {
      const { service, userRepository, rangesService } = createTestContext();
      userRepository.getFullUserProfile
        .mockResolvedValueOnce(adminProfile)
        .mockResolvedValueOnce(targetProfile);
      userRepository.getRoles.mockResolvedValue([rangeRole]);
      rangesService.existsRangeById.mockResolvedValue(Result.ok(true));

      const result = await service.assignRoleToUser({
        targetUserId: targetProfile.id,
        roleId: rangeRole.id,
        rangeId: 7,
        requester,
      });

      expect(result.isSuccess).toBe(true);
      expect(userRepository.assignRangeRole).toHaveBeenCalledWith(
        targetProfile.id,
        rangeRole.id,
        7
      );
      expect(userRepository.assignGlobalRole).not.toHaveBeenCalled();
    });

    it('fails when any repository call rejects', async () => {
      const { service, userRepository } = createTestContext();
      const failure = new Error('unexpected');
      userRepository.getFullUserProfile.mockRejectedValue(failure);

      const result = await service.assignRoleToUser({
        targetUserId: 1,
        roleId: 1,
        rangeId: null,
        requester,
      });

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBe(failure);
    });
  });

  describe('removeRoleFromUser', () => {
    const requester = makeUserDto({ id: 30 });
    const adminProfile = makeProfile({
      id: requester.id,
      roles: [adminRoleName],
    });
    const targetProfile = makeProfile({ id: 40 });
    const globalRole = makeRole({ id: 3, name: adminRoleName, scope: 'global' });
    const rangeRole = makeRole({ id: 4, name: 'Range Officer', scope: 'range' });

    it('fails when the requester lacks administrator rights', async () => {
      const { service, userRepository } = createTestContext();
      userRepository.getFullUserProfile.mockResolvedValue(makeProfile({ roles: [] }));

      const result = await service.removeRoleFromUser({
        targetUserId: targetProfile.id,
        roleId: globalRole.id,
        rangeId: null,
        requester,
      });

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(ForbiddenError);
    });

    it('fails when the target user does not exist', async () => {
      const { service, userRepository } = createTestContext();
      userRepository.getFullUserProfile
        .mockResolvedValueOnce(adminProfile)
        .mockResolvedValueOnce(null);

      const result = await service.removeRoleFromUser({
        targetUserId: targetProfile.id,
        roleId: globalRole.id,
        rangeId: null,
        requester,
      });

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(UserNotFoundError);
    });

    it('fails when the role cannot be found', async () => {
      const { service, userRepository } = createTestContext();
      userRepository.getFullUserProfile
        .mockResolvedValueOnce(adminProfile)
        .mockResolvedValueOnce(targetProfile);
      userRepository.getRoles.mockResolvedValue([globalRole]);

      const result = await service.removeRoleFromUser({
        targetUserId: targetProfile.id,
        roleId: 999,
        rangeId: null,
        requester,
      });

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(RoleNotFoundError);
    });

    it('fails when removing a global role with a range id', async () => {
      const { service, userRepository } = createTestContext();
      userRepository.getFullUserProfile
        .mockResolvedValueOnce(adminProfile)
        .mockResolvedValueOnce(targetProfile);
      userRepository.getRoles.mockResolvedValue([globalRole]);

      const result = await service.removeRoleFromUser({
        targetUserId: targetProfile.id,
        roleId: globalRole.id,
        rangeId: 1,
        requester,
      });

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(RoleScopeError);
    });

    it('fails when removing a range role without a range id', async () => {
      const { service, userRepository } = createTestContext();
      userRepository.getFullUserProfile
        .mockResolvedValueOnce(adminProfile)
        .mockResolvedValueOnce(targetProfile);
      userRepository.getRoles.mockResolvedValue([rangeRole]);

      const result = await service.removeRoleFromUser({
        targetUserId: targetProfile.id,
        roleId: rangeRole.id,
        rangeId: null,
        requester,
      });

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(RoleScopeError);
    });

    it('fails when the range does not exist while removing a range role', async () => {
      const { service, userRepository, rangesService } = createTestContext();
      userRepository.getFullUserProfile
        .mockResolvedValueOnce(adminProfile)
        .mockResolvedValueOnce(targetProfile);
      userRepository.getRoles.mockResolvedValue([rangeRole]);
      rangesService.existsRangeById.mockResolvedValue(Result.ok(false));

      const result = await service.removeRoleFromUser({
        targetUserId: targetProfile.id,
        roleId: rangeRole.id,
        rangeId: 10,
        requester,
      });

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(RangeNotFoundError);
    });

    it('removes a global role when all checks pass and rangeId=0 is normalized', async () => {
      const { service, userRepository } = createTestContext();
      userRepository.getFullUserProfile
        .mockResolvedValueOnce(adminProfile)
        .mockResolvedValueOnce(targetProfile);
      userRepository.getRoles.mockResolvedValue([globalRole]);

      const result = await service.removeRoleFromUser({
        targetUserId: targetProfile.id,
        roleId: globalRole.id,
        rangeId: 0,
        requester,
      });

      expect(result.isSuccess).toBe(true);
      expect(userRepository.removeGlobalRole).toHaveBeenCalledWith(
        targetProfile.id,
        globalRole.id
      );
      expect(userRepository.removeRangeRole).not.toHaveBeenCalled();
    });

    it('removes a range role when the range exists', async () => {
      const { service, userRepository, rangesService } = createTestContext();
      userRepository.getFullUserProfile
        .mockResolvedValueOnce(adminProfile)
        .mockResolvedValueOnce(targetProfile);
      userRepository.getRoles.mockResolvedValue([rangeRole]);
      rangesService.existsRangeById.mockResolvedValue(Result.ok(true));

      const result = await service.removeRoleFromUser({
        targetUserId: targetProfile.id,
        roleId: rangeRole.id,
        rangeId: 6,
        requester,
      });

      expect(result.isSuccess).toBe(true);
      expect(userRepository.removeRangeRole).toHaveBeenCalledWith(
        targetProfile.id,
        rangeRole.id,
        6
      );
      expect(userRepository.removeGlobalRole).not.toHaveBeenCalled();
    });

    it('fails when any repository call rejects', async () => {
      const { service, userRepository } = createTestContext();
      const failure = new Error('unexpected remove failure');
      userRepository.getFullUserProfile.mockRejectedValue(failure);

      const result = await service.removeRoleFromUser({
        targetUserId: targetProfile.id,
        roleId: globalRole.id,
        rangeId: null,
        requester,
      });

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBe(failure);
    });
  });
});
