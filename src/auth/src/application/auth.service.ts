import {
  AuditLog,
  IAdminService,
  IUserService,
  RegisteredUserDto,
  RegisterUserRequestDto,
} from '@strzel-sobie/common';
import { IAuthRepository } from '../domain/auth.repository';
import { EmailAlreadyExistsError } from '../domain/errors';
import * as bcrypt from 'bcryptjs';

export class AuthService {
  constructor(
    private readonly authRepository: IAuthRepository,
    private readonly userService: IUserService,
    private readonly adminService: IAdminService
  ) {}

  public async register(
    dto: RegisterUserRequestDto,
    sourceIp: string,
    proxiedIp: string
  ): Promise<RegisteredUserDto> {
    const existingUser = await this.userService.findUserByEmail(dto.email);

    if (existingUser) {
      throw new EmailAlreadyExistsError(dto.email);
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

    return {
      id: newUser.id,
      email: newUser.email,
      roles: ['Guest'], // Placeholder
    };
  }
}
""