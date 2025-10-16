import { Context as HonoContext } from 'hono';
import { RangesService } from '@strzel-sobie/ranges';
import { AuthService, Session } from '@strzel-sobie/auth';

export type Variables = {
  authService: AuthService;
  userService: UserService;
  rangesService: RangesService;
  session: Session;
};

export type Context = HonoContext<{ Bindings: Env; Variables: Variables }>;
