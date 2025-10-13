import { Context as HonoContext } from 'hono';
import { D1Database } from '@cloudflare/workers-types';
import { AdminService } from '@strzel-sobie/admin';
import { AuthService, Session } from '@strzel-sobie/auth';

export type Variables = {
  authService: AuthService;
  userService: UserService;
  adminService: AdminService;
  session: Session;
};

export type Context = HonoContext<{ Bindings: Env; Variables: Variables }>;
