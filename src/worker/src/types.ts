import { Context as HonoContext } from 'hono';
import { IAuthService, SessionData } from '@strzel-sobie/common/models';
import { AuditService } from '@strzel-sobie/audit';
import { ReservationsService } from '@strzel-sobie/reservations';
import { RangesService } from '@strzel-sobie/ranges';
import { UserService } from '@strzel-sobie/users';
import { UserDto } from '@strzel-sobie/common';

export type Env = {
  DB: D1Database;
  SESSIONS_KV: KVNamespace;
  AUTH_MODULE?: string;
};

export type Variables = {
  authService: IAuthService;
  userService: UserService;
  rangesService: RangesService;
  reservationsService: ReservationsService;
  auditService: AuditService;
  session: SessionData;
  user: UserDto;
};

export type Context = HonoContext<{ Bindings: Env; Variables: Variables }>;
export type AppContext = Context;
