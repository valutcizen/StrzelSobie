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
import { GetRange } from './endpoints/v1/ranges/get-range';
import { UpdateRange } from './endpoints/v1/ranges/update-range';
import { GetEvents } from './endpoints/v1/ranges/get-events';
import { CreateProposition } from './endpoints/v1/ranges/create-proposition';
import { Env, Variables } from './types';
import { RangesDbRepository, RangesService } from '@strzel-sobie/ranges';
import {
  AuthDbRepository,
  AuthService,
  SessionKvRepository,
} from '@strzel-sobie/auth';
import { UserDbRepository, UserService } from '@strzel-sobie/users';
import { ReservationsDbRepository, ReservationsService } from '@strzel-sobie/reservations';
import { AuditDbRepository, AuditService } from '@strzel-sobie/audit';
import { authMiddleware } from './middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware for setting up services
app.use('*', async (c, next) => {
  // Repositories
  const authRepository = new AuthDbRepository(c.env.DB);
  const sessionRepository = new SessionKvRepository(c.env.SESSIONS_KV);
  const userRepository = new UserDbRepository(c.env.DB);
  const rangesRepository = new RangesDbRepository(c.env.DB);
  const reservationsRepository = new ReservationsDbRepository(c.env.DB);
  const auditRepository = new AuditDbRepository(c.env.DB);

  // Services
  const rangesService = new RangesService(rangesRepository);
  const userService = new UserService(userRepository, rangesService);
  const authService = new AuthService(
    authRepository,
    sessionRepository,
    userService,
    rangesService
  );
  const auditService = new AuditService(auditRepository);
  const reservationsService = new ReservationsService(rangesService, reservationsRepository, auditService);

  c.set('authService', authService);
  c.set('userService', userService);
  c.set('rangesService', rangesService);
  c.set('reservationsService', reservationsService);
  c.set('auditService', auditService);

  await next();
});

const openapi = fromHono(app, {
  docs_url: '/',
});

openapi.post('/api/v1/auth/register', Register);
openapi.post('/api/v1/auth/login', Login);
openapi.post('/api/v1/auth/logout', Logout);
openapi.get('/api/v1/auth/me', authMiddleware, Me);

openapi.get('/api/v1/users', authMiddleware, GetUsers);
openapi.get('/api/v1/user/roles', authMiddleware, GetRoles);
openapi.post('/api/v1/users/:userId/roles', authMiddleware, SetUserRoleRoute);
openapi.delete('/api/v1/users/:userId/roles/:roleId', authMiddleware, RemoveUserRoleRoute);

openapi.get('/api/v1/ranges', GetRangesRoute);
openapi.get('/api/v1/ranges/:rangeSlug', GetRange);
openapi.patch('/api/v1/ranges/:rangeSlug', authMiddleware, UpdateRange);
openapi.get('/api/v1/ranges/:rangeSlug/events', authMiddleware, GetEvents);
openapi.post('/api/v1/ranges/:rangeSlug/propositions', authMiddleware, CreateProposition);

export default app;
