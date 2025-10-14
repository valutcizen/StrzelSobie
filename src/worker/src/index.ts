import { fromHono } from 'chanfana';
import { Hono } from 'hono';
import { Login } from './endpoints/v1/auth/login';
import { Logout } from './endpoints/v1/auth/logout';
import { Me } from './endpoints/v1/auth/me';
import { Register } from './endpoints/v1/auth/register';
import { GetRoles } from './endpoints/v1/user/roles';
import { GetUsers } from './endpoints/v1/user/get-users';
import { SetUserRoleRoute } from './endpoints/v1/user/set-role';
import { RemoveUserRoleRoute } from './endpoints/v1/user/remove-role';
import { GetRangesRoute } from './endpoints/v1/ranges/get-ranges'
import { Env, Variables } from './types';
import { AdminDbRepository, AdminService } from '@strzel-sobie/admin';
import {
  AuthDbRepository,
  AuthService,
  SessionKvRepository,
} from '@strzel-sobie/auth';
import { UserDbRepository, UserService } from '@strzel-sobie/users';
import { authMiddleware } from './middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware for setting up services
app.use('*', async (c, next) => {
  // Repositories
  const authRepository = new AuthDbRepository(c.env.DB);
  const sessionRepository = new SessionKvRepository(c.env.SESSIONS_KV);
  const userRepository = new UserDbRepository(c.env.DB);
  const adminRepository = new AdminDbRepository(c.env.DB);

  // Services
  const adminService = new AdminService(adminRepository);
  const userService = new UserService(userRepository, adminService);
  const authService = new AuthService(
    authRepository,
    sessionRepository,
    userService,
    adminService
  );

  c.set('authService', authService);
  c.set('userService', userService);
  c.set('adminService', adminService);

  await next();
});

const openapi = fromHono(app, {
  docs_url: '/',
});

openapi.get('/api/v1/auth/me', authMiddleware, Me);
openapi.post('/api/v1/auth/register', Register);
openapi.post('/api/v1/auth/login', Login);
openapi.post('/api/v1/auth/logout', Logout);
openapi.get('/api/v1/user/roles', authMiddleware, GetRoles);
openapi.get('/api/v1/users', authMiddleware, GetUsers);
openapi.post('/api/v1/users/:userId/roles', authMiddleware, SetUserRoleRoute);
openapi.delete('/api/v1/users/:userId/roles/:roleId', authMiddleware, RemoveUserRoleRoute);
openapi.get('/api/v1/ranges', GetRangesRoute);

export default app;
