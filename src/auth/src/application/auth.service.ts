import {
  AuditLog,
  IAdminService,
  IUserService,
  LoginUserDto,
  RegisteredUserDto,
  RegisterUserRequestDto,
  Result,
  SessionData,
} from '@strzel-sobie/common';
import { IAuthRepository } from '../domain/auth.repository';
import { EmailAlreadyExistsError, InvalidCredentialsError } from '../domain/errors';
import * as bcrypt from 'bcryptjs';
import { ISessionRepository } from '../domain/session.repository';

export class AuthService {
  constructor(
    private readonly authRepository: IAuthRepository,
    private readonly sessionRepository: ISessionRepository,
    private readonly userService: IUserService,
    private readonly adminService: IAdminService
  ) {}

  public async login(dto: LoginUserDto): Promise<Result<{ token: string, session: SessionData }, InvalidCredentialsError>> {
    const user = await this.userService.findUserByEmail(dto.email);

    if (!user) {
      return Result.fail(new InvalidCredentialsError());
    }

    const credentials = await this.authRepository.findCredentialsByUserId(user.id);

    if (!credentials) {
      return Result.fail(new InvalidCredentialsError());
    }

    const isPasswordValid = await bcrypt.compare(dto.password, credentials.passwordHash);

    if (!isPasswordValid) {
      return Result.fail(new InvalidCredentialsError());
    }

    const userProfile = await this.userService.getFullUserProfile(user.id);

    if (!userProfile) {
      // This should not happen if user exists
      return Result.fail(new InvalidCredentialsError());
    }

    const session: SessionData = {
      userId: userProfile.id,
      email: userProfile.email,
      phoneNumber: userProfile.phoneNumber,
      roles: userProfile.roles,
      rangeRoles: userProfile.rangeRoles,
    };

    const token = await this.sessionRepository.createSession(session);

    return Result.ok({ token, session });
  }

  public async validateSession(token: string): Promise<Result<SessionData, Error>> {
    const session = await this.sessionRepository.getSession(token);

    if (!session) {
      return Result.fail(new Error('Invalid session token'));
    }

    return Result.ok(session);
  }

  public async register(
    dto: RegisterUserRequestDto,
    sourceIp: string,
    proxiedIp: string
  ): Promise<Result<RegisteredUserDto, EmailAlreadyExistsError>> {
    const existingUser = await this.userService.findUserByEmail(dto.email);

    if (existingUser) {
      return Result.fail(new EmailAlreadyExistsError(dto.email));
    }

    const newUser = await this.userService.createUser(dto.email);

    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.authRepository.saveCredentials(newUser.id, passwordHash);

    const log: AuditLog = {
      action_type: 'USER_REGISTRATION',
      target_id: newUser.id,
      details: {
        email: newUser.email,
        sourceIp,
        proxiedIp,
      },
    };

    await this.adminService.logAction(log);

    // TODO: Assign default "Guest" role

    const registeredUser: RegisteredUserDto = {
      id: newUser.id,
      email: newUser.email,
      roles: ['Guest'], // Placeholder
    };

    return Result.ok(registeredUser);
  }

  public async logout(sessionToken: string): Promise<Result<void, Error>> {
    try {
      await this.sessionRepository.deleteSession(sessionToken);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }
}
