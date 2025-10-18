import { afterEach, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  Result,
  UserNotFoundError,
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
import * as bcrypt from 'bcryptjs';

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

  it('fails login when user lookup fails', async () => {
    const ctx = createAuthServiceContext();
    const dto: LoginUserDto = { email: 'john@example.com', password: VALID_PASSWORD };
    const lookupError = new Error('lookup failed');

    ctx.userService.findUserByEmail.mockResolvedValue(Result.fail(lookupError));

    const result = await ctx.service.login(dto);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(InvalidCredentialsError);
    expect(ctx.authRepository.findCredentialsByUserId).not.toHaveBeenCalled();
  });

  it('fails login when user does not exist', async () => {
    const ctx = createAuthServiceContext();
    const dto: LoginUserDto = { email: 'ghost@example.com', password: VALID_PASSWORD };

    ctx.userService.findUserByEmail.mockResolvedValue(Result.fail(new UserNotFoundError('User not found')));

    const result = await ctx.service.login(dto);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(InvalidCredentialsError);
    expect(ctx.authRepository.findCredentialsByUserId).not.toHaveBeenCalled();
  });

  it('fails login when credentials are missing', async () => {
    const ctx = createAuthServiceContext();
    const dto: LoginUserDto = { email: 'john@example.com', password: VALID_PASSWORD };
    const user: UserIdentifierDto = { id: 3, email: dto.email };

    ctx.userService.findUserByEmail.mockResolvedValue(Result.ok(user));
    ctx.authRepository.findCredentialsByUserId.mockResolvedValue(null);

    const result = await ctx.service.login(dto);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(InvalidCredentialsError);
    expect(ctx.userService.getFullUserProfile).not.toHaveBeenCalled();
  });

  it('fails login when profile lookup fails', async () => {
    const ctx = createAuthServiceContext();
    const dto: LoginUserDto = { email: 'john@example.com', password: VALID_PASSWORD };
    const user: UserIdentifierDto = { id: 4, email: dto.email };
    const credentials: AuthCredentials = { userId: user.id, passwordHash: PASSWORD_HASH };
    const profileError = new Error('profile failed');

    ctx.userService.findUserByEmail.mockResolvedValue(Result.ok(user));
    ctx.authRepository.findCredentialsByUserId.mockResolvedValue(credentials);
    ctx.userService.getFullUserProfile.mockResolvedValue(Result.fail(profileError));

    const result = await ctx.service.login(dto);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(InvalidCredentialsError);
    expect(ctx.sessionRepository.createSession).not.toHaveBeenCalled();
  });

  it('fails login when profile is missing', async () => {
    const ctx = createAuthServiceContext();
    const dto: LoginUserDto = { email: 'john@example.com', password: VALID_PASSWORD };
    const user: UserIdentifierDto = { id: 5, email: dto.email };
    const credentials: AuthCredentials = { userId: user.id, passwordHash: PASSWORD_HASH };

    ctx.userService.findUserByEmail.mockResolvedValue(Result.ok(user));
    ctx.authRepository.findCredentialsByUserId.mockResolvedValue(credentials);
    ctx.userService.getFullUserProfile.mockResolvedValue(
      Result.fail(new UserNotFoundError('User not found'))
    );

    const result = await ctx.service.login(dto);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(InvalidCredentialsError);
    expect(ctx.sessionRepository.createSession).not.toHaveBeenCalled();
  });

  it('returns session data when token is valid', async () => {
    const ctx = createAuthServiceContext();
    const session: SessionData = {
      userId: 10,
      email: 'john@example.com',
      phoneNumber: '+48123123123',
      roles: ['Member'],
      rangeRoles: {},
    };

    ctx.sessionRepository.getSession.mockResolvedValue(session);

    const result = await ctx.service.validateSession('token-123');

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual(session);
  });

  it('fails validation when token is unknown', async () => {
    const ctx = createAuthServiceContext();

    ctx.sessionRepository.getSession.mockResolvedValue(null);

    const result = await ctx.service.validateSession('token-456');

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(Error);
    expect(result.getError()?.message).toBe('Invalid session token');
  });

  it('fails registration when email lookup fails', async () => {
    const ctx = createAuthServiceContext();
    const dto = { email: 'john@example.com', password: VALID_PASSWORD };
    const lookupError = new Error('lookup failed');

    ctx.userService.findUserByEmail.mockResolvedValue(Result.fail(lookupError));

    const result = await ctx.service.register(dto, '1.1.1.1', '2.2.2.2');

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBe(lookupError);
    expect(ctx.userService.createUser).not.toHaveBeenCalled();
  });

  it('fails registration when email already exists', async () => {
    const ctx = createAuthServiceContext();
    const dto = { email: 'john@example.com', password: VALID_PASSWORD };
    const existing: UserIdentifierDto = { id: 5, email: dto.email };

    ctx.userService.findUserByEmail.mockResolvedValue(Result.ok(existing));

    const result = await ctx.service.register(dto, '1.1.1.1', '2.2.2.2');

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(EmailAlreadyExistsError);
  });

  it('fails registration when user creation fails', async () => {
    const ctx = createAuthServiceContext();
    const dto = { email: 'john@example.com', password: VALID_PASSWORD };
    const creationError = new Error('create failed');

    ctx.userService.findUserByEmail.mockResolvedValue(Result.fail(new UserNotFoundError('User not found')));
    ctx.userService.createUser.mockResolvedValue(Result.fail(creationError));

    const result = await ctx.service.register(dto, '1.1.1.1', '2.2.2.2');

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBe(creationError);
    expect(ctx.authRepository.saveCredentials).not.toHaveBeenCalled();
  });

  it('registers a new user and logs audit entry', async () => {
    const ctx = createAuthServiceContext();
    const dto = { email: 'john@example.com', password: VALID_PASSWORD };
    const newUser: UserIdentifierDto = { id: 7, email: dto.email };

    ctx.userService.findUserByEmail.mockResolvedValue(Result.fail(new UserNotFoundError('User not found')));
    ctx.userService.createUser.mockResolvedValue(Result.ok(newUser));

    const result = await ctx.service.register(dto, '1.1.1.1', '2.2.2.2');

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual({
      id: newUser.id,
      email: newUser.email,
    });
    expect(ctx.authRepository.saveCredentials).toHaveBeenCalledTimes(1);
    const [, storedHash] = ctx.authRepository.saveCredentials.mock.calls[0];
    expect(await bcrypt.compare(dto.password, storedHash)).toBe(true);
    expect(ctx.auditService.logAction).toHaveBeenCalledWith({
      action_type: 'USER_REGISTRATION',
      target_id: newUser.id,
      details: {
        email: newUser.email,
        sourceIp: '1.1.1.1',
        proxiedIp: '2.2.2.2',
      },
    });
  });

  it('logs out user when session deletion succeeds', async () => {
    const ctx = createAuthServiceContext();

    ctx.sessionRepository.deleteSession.mockResolvedValue();

    const result = await ctx.service.logout('token-123');

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toBeUndefined();
    expect(ctx.sessionRepository.deleteSession).toHaveBeenCalledWith('token-123');
  });

  it('fails logout when session deletion throws', async () => {
    const ctx = createAuthServiceContext();
    const deleteError = new Error('delete failed');

    ctx.sessionRepository.deleteSession.mockRejectedValue(deleteError);

    const result = await ctx.service.logout('token-123');

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBe(deleteError);
    expect(ctx.sessionRepository.deleteSession).toHaveBeenCalledWith('token-123');
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
