import {
  IAuditService,
  IAuthService,
  IUserService,
  SessionData,
  UserRole,
} from '@strzel-sobie/common/models';
import {
  ForbiddenError,
  InvalidCredentialsError,
  LoginUserDto,
  RegisterUserRequestDto,
  RegisteredUserDto,
  Result,
} from '@strzel-sobie/common';
import { ISessionRepository } from '@strzel-sobie/auth';

type SimpleUser = {
  readonly id: number;
  readonly email: string;
  readonly password: string;
  readonly roles: readonly UserRole[];
};

const SIMPLE_USERS: readonly SimpleUser[] = [
  {
    id: 1,
    email: 'admin@example.com',
    password: 'adminpassword',
    roles: [UserRole.ClubCommunityAdministrator, UserRole.Member, UserRole.Guest],
  },
  {
    id: 2,
    email: 'coordinator@example.com',
    password: 'coordinatorpassword',
    roles: [UserRole.Coordinator, UserRole.Member, UserRole.Guest],
  },
  {
    id: 3,
    email: 'member@example.com',
    password: 'memberpassword',
    roles: [UserRole.Member, UserRole.Guest],
  },
  {
    id: 4,
    email: 'guest@example.com',
    password: 'guestpassword',
    roles: [UserRole.Guest],
  },
];

export class SimpleAuthService implements IAuthService {
  constructor(
    private readonly sessionRepository: ISessionRepository,
    private readonly userService: IUserService,
    private readonly auditService: IAuditService
  ) {}

  public async login(dto: LoginUserDto): Promise<Result<{ token: string; session: SessionData }>> {
    const user = SIMPLE_USERS.find((candidate) => candidate.email === dto.email);

    if (!user || user.password !== dto.password) {
      return Result.fail(new InvalidCredentialsError());
    }

    const userResult = await this.userService.findUserByEmail(dto.email);

    if (!userResult.isSuccess) {
      return Result.fail(new InvalidCredentialsError());
    }

    const userIdentifier = userResult.getValue();

    if (!userIdentifier || userIdentifier.id !== user.id) {
      return Result.fail(new InvalidCredentialsError());
    }

    const profileResult = await this.userService.getFullUserProfile(user.id);

    if (!profileResult.isSuccess) {
      return Result.fail(new InvalidCredentialsError());
    }

    const profile = profileResult.getValue();

    if (!profile) {
      return Result.fail(new InvalidCredentialsError());
    }

    const session: SessionData = {
      userId: profile.id,
      email: profile.email,
      phoneNumber: profile.phoneNumber ?? null,
      roles: user.roles.slice(),
      rangeRoles: profile.rangeRoles ?? {},
    };

    const token = await this.sessionRepository.createSession(session);

    return Result.ok({ token, session });
  }

  public async validateSession(token: string): Promise<Result<SessionData>> {
    const session = await this.sessionRepository.getSession(token);

    if (!session) {
      return Result.fail(new Error('Invalid session token'));
    }

    return Result.ok(session);
  }

  public async register(
    _dto: RegisterUserRequestDto,
    _sourceIp: string,
    _proxiedIp: string
  ): Promise<Result<RegisteredUserDto>> {
    return Result.fail(new ForbiddenError('Registration currently not allowed'));
  }

  public async logout(sessionToken: string): Promise<Result<void>> {
    try {
      await this.sessionRepository.deleteSession(sessionToken);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }
}
