import { AuthModuleBackend } from '@strzel-sobie/common/models';
import {
  authModuleBackend,
  type IAuthRepository,
  type ISessionRepository,
} from '@strzel-sobie/auth';
import { authModuleBackend as simpleAuthModuleBackend } from '@strzel-sobie/auth-simple';

export type AuthModuleBackendType = AuthModuleBackend<IAuthRepository, ISessionRepository>;

const modules: Record<string, AuthModuleBackendType> = {
  default: authModuleBackend,
  simple: simpleAuthModuleBackend,
};

export const resolveAuthModule = (moduleKey?: string): AuthModuleBackendType => {
  const normalized = moduleKey?.trim() || 'default';
  return modules[normalized] ?? modules.default;
};
