import { IAuditService } from '../audit/service';
import { IUserService } from '../users/service';
import { IAuthService } from './service';

export interface AuthModuleBackendDeps<TAuthRepository, TSessionRepository> {
  readonly authRepository: TAuthRepository;
  readonly sessionRepository: TSessionRepository;
  readonly userService: IUserService;
  readonly auditService: IAuditService;
}

export interface AuthModuleBackend<
  TAuthRepository,
  TSessionRepository,
  TRoutesRegistry = unknown
> {
  createAuthService(deps: AuthModuleBackendDeps<TAuthRepository, TSessionRepository>): IAuthService;
  registerAuthRoutes?(
    registry: TRoutesRegistry,
    deps: AuthModuleBackendDeps<TAuthRepository, TSessionRepository>
  ): void;
}
