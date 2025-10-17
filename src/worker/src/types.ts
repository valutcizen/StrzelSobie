import { Context as HonoContext } from 'hono';
import { AuthService, Session } from '@strzel-sobie/auth';
import { AuditService } from '@strzel-sobie/audit';
import { ReservationsService } from '@strzel-sobie/reservations';
import { RangesService } from '@strzel-sobie/ranges';
import { UserService } from '@strzel-sobie/users';
import { UserDto } from '@strzel-sobie/common';

export type Env = {
  DB: D1Database;
  SESSIONS_KV: KVNamespace;
};

export type Variables = {
  authService: AuthService;
  userService: UserService;
  rangesService: RangesService;
  reservationsService: ReservationsService;
  auditService: AuditService;
  session: Session;
  user: UserDto;
};

export type Context = HonoContext<{ Bindings: Env; Variables: Variables }>;
export type AppContext = Context;
