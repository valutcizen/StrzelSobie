import { Context as HonoContext } from 'hono';
import { IAuthService, SessionData } from '@strzel-sobie/common/models';
import { AuditService } from '@strzel-sobie/audit';
import { EventsService } from '@strzel-sobie/events';
import { ReservationsService } from '@strzel-sobie/reservations';
import { RangesService } from '@strzel-sobie/ranges';
import { UserService } from '@strzel-sobie/users';
import { RangeType, UserDto } from '@strzel-sobie/common';

export type Env = {
  DB: D1Database;
  SESSIONS_KV: KVNamespace;
  AUTH_MODULE?: string;
  NOTIFICATIONS_EMAIL_PROVIDER?: string;
  NOTIFICATIONS_EMAIL_FROM?: string;
  NOTIFICATIONS_RETENTION_DAYS?: string;
};

export type Variables = {
  authService: IAuthService;
  userService: UserService;
  rangesService: RangesService;
  reservationsService: ReservationsService;
  eventsService: EventsService;
  auditService: AuditService;
  session: SessionData;
  user: UserDto;
  embedMapConfig: {
    allowedTypes: RangeType[];
    cacheVersion: string;
  };
};

export type Context = HonoContext<{ Bindings: Env; Variables: Variables }>;
export type AppContext = Context;
