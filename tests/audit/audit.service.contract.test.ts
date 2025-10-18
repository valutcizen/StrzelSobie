import { beforeEach, afterEach, describe, expect, it, vi, type Mocked } from 'vitest';
import {
  EmailAlreadyExistsError,
  Result,
  type AuditLogEntry,
  type LoginUserDto,
  type MeDto,
  type RegisterUserRequestDto,
  type SessionData,
  type UserIdentifierDto,
  type IAuditService,
  type IUserService,
  type AuthCredentials,
} from '../../src/common/src';
import { AuthService } from '../../src/auth/src/application/auth.service';
import type { IAuthRepository } from '../../src/auth/src/domain/auth.repository';
import type { ISessionRepository } from '../../src/auth/src/domain/session.repository';
import * as bcrypt from 'bcryptjs';

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('AuthService', () => {
  it('returns a session token when login succeeds', async () => {
    const ctx = createAuthServiceContext();
    const dto: LoginUserDto = { email: 'john@example.com', password: 'Secret123' };
    const user: UserIdentifierDto = { id: 1, email: dto.email };
    const profile: MeDto = {
      id: 1,
      email: dto.email,
      phoneNumber: '+48123123123',
      roles: ['Member'],
      rangeRoles: {},
    };
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const credentials: AuthCredentials = { userId: 1, passwordHash };

    ctx.userService.findUserByEmail.mockResolvedValue(Result.ok(user));
    ctx.authRepository.findCredentialsByUserId.mockResolvedValue(credentials);
    ctx.userService.getFullUserProfile.mockResolvedValue(Result.ok(profile));
    ctx.sessionRepository.createSession.mockResolvedValue('token-123');

    const result = await ctx.service.login(dto);

    expect(result.isSuccess).toBe(true);
    const value = result.getValue();
    expect(value.token).toBe('token-123');
    expect(value.session).toEqual<SessionData>({
      userId: profile.id,
      email: profile.email,
      phoneNumber: profile.phoneNumber,
      roles: profile.roles,
      rangeRoles: profile.rangeRoles,
    });
    expect(ctx.sessionRepository.createSession).toHaveBeenCalledWith({
      userId: profile.id,
      email: profile.email,
      phoneNumber: profile.phoneNumber,
      roles: profile.roles,
      rangeRoles: profile.rangeRoles,
    });
  });

  it('fails login when user lookup fails', async () => {
    const ctx = createAuthServiceContext();
    const dto: LoginUserDto = { email: 'john@example.com', password: 'Secret123' };

    ctx.userService.findUserByEmail.mockResolvedValue(
      Result.fail<UserIdentifierDto>(new Error('db down')),
    );

    const result = await ctx.service.login(dto);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toMatchObject({ name: 'InvalidCredentialsError' });
    expect(ctx.userService.getFullUserProfile).not.toHaveBeenCalled();
  });

  it('fails login when password is invalid', async () => {
    const ctx = createAuthServiceContext();
    const dto: LoginUserDto = { email: 'john@example.com', password: 'Secret123' };
    const user: UserIdentifierDto = { id: 4, email: dto.email };
    const credentials: AuthCredentials = {
      userId: 4,
      passwordHash: await bcrypt.hash('different-secret', 10),
    };

    ctx.userService.findUserByEmail.mockResolvedValue(Result.ok(user));
    ctx.authRepository.findCredentialsByUserId.mockResolvedValue(credentials);

    const result = await ctx.service.login(dto);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toMatchObject({ name: 'InvalidCredentialsError' });
    expect(ctx.sessionRepository.createSession).not.toHaveBeenCalled();
  });

  it('registers a user, saves credentials, and writes an audit log', async () => {
    const ctx = createAuthServiceContext();
    const dto: RegisterUserRequestDto = {
      email: 'new@example.com',
      password: 'Secret123!',
    };
    const newUser: UserIdentifierDto = { id: 12, email: dto.email };
    const sourceIp = '192.0.2.10';
    const proxiedIp = '198.51.100.5';

    ctx.userService.findUserByEmail.mockResolvedValue(
      Result.ok(null as unknown as UserIdentifierDto),
    );
    ctx.userService.createUser.mockResolvedValue(Result.ok(newUser));
    ctx.auditService.logAction.mockResolvedValue(Result.ok<void>(undefined));

    const result = await ctx.service.register(dto, sourceIp, proxiedIp);

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual({ id: newUser.id, email: newUser.email });
    expect(ctx.authRepository.saveCredentials).toHaveBeenCalledTimes(1);
    const [savedUserId, savedHash] = ctx.authRepository.saveCredentials.mock.calls[0]!;
    expect(savedUserId).toBe(newUser.id);
    expect(await bcrypt.compare(dto.password, savedHash)).toBe(true);
    expect(ctx.auditService.logAction).toHaveBeenCalledWith<AuditLogEntry>({
      action_type: 'USER_REGISTRATION',
      target_id: newUser.id,
      details: {
        email: newUser.email,
        sourceIp,
        proxiedIp,
      },
    });
  });

  it('fails registration when email already exists', async () => {
    const ctx = createAuthServiceContext();
    const dto: RegisterUserRequestDto = {
      email: 'existing@example.com',
      password: 'Secret123!',
    };
    const existingUser: UserIdentifierDto = { id: 50, email: dto.email };

    ctx.userService.findUserByEmail.mockResolvedValue(Result.ok(existingUser));

    const result = await ctx.service.register(dto, '192.0.2.1', '198.51.100.1');

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(EmailAlreadyExistsError);
    expect(ctx.userService.createUser).not.toHaveBeenCalled();
    expect(ctx.auditService.logAction).not.toHaveBeenCalled();
  });

  it('fails session validation when token is not found', async () => {
    const ctx = createAuthServiceContext();
    ctx.sessionRepository.getSession.mockResolvedValue(null);

    const result = await ctx.service.validateSession('missing-token');

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toMatchObject({ message: 'Invalid session token' });
  });

  it('fails logout when session deletion throws', async () => {
    const ctx = createAuthServiceContext();
    const expectedError = new Error('delete failed');
    ctx.sessionRepository.deleteSession.mockRejectedValue(expectedError);

    const result = await ctx.service.logout('token-1');

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBe(expectedError);
  });
});

function createAuthServiceContext() {
  const authRepository: Mocked<IAuthRepository> = {
    saveCredentials: vi.fn<[number, string], Promise<void>>(),
    findCredentialsByUserId: vi.fn<[number], Promise<AuthCredentials | null>>(),
  };

  const sessionRepository: Mocked<ISessionRepository> = {
    createSession: vi.fn<[SessionData], Promise<string>>(),
    getSession: vi.fn<[string], Promise<SessionData | null>>(),
    deleteSession: vi.fn<[string], Promise<void>>(),
  };

  const userService: Mocked<IUserService> = {
    findUserByEmail: vi.fn<[string], Promise<Result<UserIdentifierDto>>>(),
    createUser: vi.fn<[string], Promise<Result<UserIdentifierDto>>>(),
    getFullUserProfile: vi.fn<[number], Promise<Result<MeDto>>>(),
    getRoles: vi.fn(),
    getUserById: vi.fn(),
    getUsers: vi.fn(),
    assignRoleToUser: vi.fn(),
    removeRoleFromUser: vi.fn(),
  };

  const auditService: Mocked<IAuditService> = {
    logAction: vi.fn<[AuditLogEntry], Promise<Result<void>>>(),
  };

  const service = new AuthService(authRepository, sessionRepository, userService, auditService);

  return {
    service,
    authRepository,
    sessionRepository,
    userService,
    auditService,
  };
}
