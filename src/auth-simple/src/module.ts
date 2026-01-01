import { AuthModuleBackend } from '@strzel-sobie/common/models';
import type { IAuthRepository, ISessionRepository } from '@strzel-sobie/auth';
import { SimpleAuthService } from './application/simple-auth.service';

export const authModuleBackend: AuthModuleBackend<IAuthRepository, ISessionRepository> = {
  createAuthService: ({ sessionRepository, userService, auditService }) =>
    new SimpleAuthService(sessionRepository, userService, auditService),
};
