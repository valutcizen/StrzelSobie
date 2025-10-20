import { describe, it, expect, vi, type Mocked } from 'vitest';
import {
  Result,
  UserNotFoundError,
  type IUserService,
  type IAuditService,
  type LoginUserDto,
  type RegisterUserRequestDto,
  type MeDto,
  type UserIdentifierDto,
} from '@strzel-sobie/common';
import { AuthService } from '@strzel-sobie/auth/src/application/auth.service';
import type { IAuthRepository } from '@strzel-sobie/auth/src/domain/auth.repository';
import type { ISessionRepository } from '@strzel-sobie/auth/src/domain/session.repository';

const VALID_PASSWORD = 'Secret123';
const PASSWORD_HASH =
  '$2b$10$J7hNu2GbWLgREU7qxAttWOpLwS6pg7khkYW.IRdGNBGAnddz0a9Ai'; // hash for Secret123

describe('AuthService ↔ Users & Audit module integration', () => {
  it('delegates user lookups to the users module during login', async () => {
    const ctx = createAuthServiceContext();
    const loginDto: LoginUserDto = { email: 'member@example.com', password: VALID_PASSWORD };
    const user: UserIdentifierDto = { id: 42, email: loginDto.email };
    const profile: MeDto = {
      id: user.id,
      email: loginDto.email,
      phoneNumber: '+48123123123',
      roles: ['Member'],
      rangeRoles: {},
    };

    ctx.userService.findUserByEmail.mockResolvedValue(Result.ok(user));
    ctx.authRepository.findCredentialsByUserId.mockResolvedValue({
      userId: user.id,
      passwordHash: PASSWORD_HASH,
    });
    ctx.userService.getFullUserProfile.mockResolvedValue(Result.ok(profile));
    ctx.sessionRepository.createSession.mockResolvedValue('session-token');

    const result = await ctx.service.login(loginDto);

    expect(result.isSuccess).toBe(true);
    expect(ctx.userService.findUserByEmail).toHaveBeenCalledWith(loginDto.email);
    expect(ctx.userService.getFullUserProfile).toHaveBeenCalledWith(user.id);
  });

  it('logs a registration event through the audit module when a new user registers', async () => {
    const ctx = createAuthServiceContext();
    const registerDto: RegisterUserRequestDto = {
      email: 'fresh@example.com',
      password: 'AnotherSecret1',
    };
    const newUser: UserIdentifierDto = { id: 7, email: registerDto.email };

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    ctx.userService.findUserByEmail.mockResolvedValue(Result.fail(new UserNotFoundError(registerDto.email)));
    ctx.userService.createUser.mockResolvedValue(Result.ok(newUser));
    ctx.auditService.logAction.mockResolvedValue(Result.ok(undefined));

    const result = await ctx.service.register(registerDto, '192.168.0.10', '203.0.113.5');

    consoleErrorSpy.mockRestore();

    expect(result.isSuccess).toBe(true);
    expect(ctx.userService.createUser).toHaveBeenCalledWith(registerDto.email);
    expect(ctx.auditService.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type: 'USER_REGISTRATION',
        target_id: newUser.id,
        details: expect.objectContaining({
          email: newUser.email,
          sourceIp: '192.168.0.10',
          proxiedIp: '203.0.113.5',
        }),
      })
    );
  });
});

function createAuthServiceContext(): {
  authRepository: Mocked<IAuthRepository>;
  sessionRepository: Mocked<ISessionRepository>;
  userService: Mocked<IUserService>;
  auditService: Mocked<IAuditService>;
  service: AuthService;
} {
  const authRepository: Mocked<IAuthRepository> = {
    findCredentialsByUserId: vi.fn(),
    saveCredentials: vi.fn(),
  };

  const sessionRepository: Mocked<ISessionRepository> = {
    createSession: vi.fn(),
    deleteSession: vi.fn(),
    getSession: vi.fn(),
  };

  const userService: Mocked<IUserService> = {
    findUserByEmail: vi.fn(),
    createUser: vi.fn(),
    getFullUserProfile: vi.fn(),
    getRoles: vi.fn(),
    getUserById: vi.fn(),
    getUsers: vi.fn(),
    assignRoleToUser: vi.fn(),
    removeRoleFromUser: vi.fn(),
  };

  const auditService: Mocked<IAuditService> = {
    logAction: vi.fn(),
  };

  const service = new AuthService(
    authRepository,
    sessionRepository,
    userService,
    auditService
  );

  return {
    authRepository,
    sessionRepository,
    userService,
    auditService,
    service,
  };
}
