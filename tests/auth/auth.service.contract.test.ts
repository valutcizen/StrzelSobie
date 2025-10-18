import { afterEach, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import {
  InvalidCredentialsError,
  Result,
  type AuthCredentials,
  type IAuditService,
  type IUserService,
  type LoginUserDto,
  type MeDto,
  type SessionData,
  type UserIdentifierDto,
} from '@strzel-sobie/common';
import { AuthService } from '../../src/auth/src/application/auth.service';
import type { IAuthRepository } from '../../src/auth/src/domain/auth.repository';
import type { ISessionRepository } from '../../src/auth/src/domain/session.repository';

const VALID_PASSWORD = 'Secret123';
const PASSWORD_HASH =
  '$2b$10$J7hNu2GbWLgREU7qxAttWOpLwS6pg7khkYW.IRdGNBGAnddz0a9Ai'; // Precomputed from bcrypt.hash(VALID_PASSWORD, 10)

describe('AuthService contract', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns a session token when valid credentials are provided', async () => {
    const ctx = createAuthServiceContext();
    const dto: LoginUserDto = { email: 'john@example.com', password: VALID_PASSWORD };
    const user: UserIdentifierDto = { id: 1, email: dto.email };
    const profile: MeDto = {
      id: user.id,
      email: dto.email,
      phoneNumber: '+48123123123',
      roles: ['Member'],
      rangeRoles: {},
    };
    const credentials: AuthCredentials = { userId: user.id, passwordHash: PASSWORD_HASH };

    ctx.userService.findUserByEmail.mockResolvedValue(Result.ok(user));
    ctx.authRepository.findCredentialsByUserId.mockResolvedValue(credentials);
    ctx.userService.getFullUserProfile.mockResolvedValue(Result.ok(profile));
    ctx.sessionRepository.createSession.mockResolvedValue('token-123');

    const result = await ctx.service.login(dto);

    expect(result.isSuccess).toBe(true);
    const payload = result.getValue();
    expect(payload.token).toBe('token-123');
    expect(payload.session).toEqual<SessionData>({
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

  it('fails login when password verification fails', async () => {
    const ctx = createAuthServiceContext();
    const dto: LoginUserDto = { email: 'john@example.com', password: 'WrongSecret!' };
    const user: UserIdentifierDto = { id: 2, email: dto.email };
    const credentials: AuthCredentials = { userId: user.id, passwordHash: PASSWORD_HASH };

    ctx.userService.findUserByEmail.mockResolvedValue(Result.ok(user));
    ctx.authRepository.findCredentialsByUserId.mockResolvedValue(credentials);

    const result = await ctx.service.login(dto);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(InvalidCredentialsError);
    expect(ctx.userService.getFullUserProfile).not.toHaveBeenCalled();
    expect(ctx.sessionRepository.createSession).not.toHaveBeenCalled();
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
    logAction: vi.fn(),
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
