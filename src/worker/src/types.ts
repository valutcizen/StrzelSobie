import { Context as HonoContext } from 'hono';
import { D1Database } from '@cloudflare/workers-types';
import { AdminService } from '@strzel-sobie/admin';
import { AuthService } from '@strzel-sobie/auth';
import { UserService } from '@strzel-sobie/users';

export type Env = {
  DB: D1Database;
  SESSIONS_KV: KVNamespace;
};

export type Variables = {
  authService: AuthService;
  userService: UserService;
  adminService: AdminService;
};

export type Context = HonoContext<{ Bindings: Env; Variables: Variables }>;
