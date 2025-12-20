import { AuthModuleBackend } from '@strzel-sobie/common/models';
import { AuthService } from './application/auth.service';
import { IAuthRepository } from './domain/auth.repository';
import { ISessionRepository } from './domain/session.repository';

export const authModuleBackend: AuthModuleBackend<IAuthRepository, ISessionRepository> = {
  createAuthService: ({ authRepository, sessionRepository, userService, auditService }) =>
    new AuthService(authRepository, sessionRepository, userService, auditService),
};
