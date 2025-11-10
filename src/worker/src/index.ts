import { fromHono } from 'chanfana';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Login } from './endpoints/v1/auth/login';
import { Logout } from './endpoints/v1/auth/logout';
import { Me } from './endpoints/v1/auth/me';
import { Register } from './endpoints/v1/auth/register';
import { GetRoles } from './endpoints/v1/user/roles';
import { GetUsers } from './endpoints/v1/user/get-users';
import { SetUserRoleRoute } from './endpoints/v1/user/set-role';
import { RemoveUserRoleRoute } from './endpoints/v1/user/remove-role';
import { GetRangesRoute } from './endpoints/v1/ranges/get-ranges';
import { GetRange } from './endpoints/v1/ranges/get-range';
import { UpdateRange } from './endpoints/v1/ranges/update-range';
import { GetEvents } from './endpoints/v1/ranges/get-events';
import { CreateProposition } from './endpoints/v1/ranges/create-proposition';
import { CreateRecord } from './endpoints/v1/ranges/create-record';
import { CreateReservation } from './endpoints/v1/ranges/create-reservation';
import { DeleteProposition } from './endpoints/v1/propositions/delete-proposition';
import { DeleteReservation } from './endpoints/v1/reservations/delete-reservation';
import { GetPropositionDetail } from './endpoints/v1/propositions/get-proposition';
import { GetReservationDetail } from './endpoints/v1/reservations/get-reservation';
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

// CORS Middleware
app.use('/api/*', cors({
  origin: (origin, c) => {
    const allowedOrigins = (c.env.ALLOWED_ORIGINS || '').split(',');
    if (allowedOrigins.includes(origin)) {
      return origin;
    }
    // Allow localhost for local development
    if (origin.startsWith('http://localhost:')) {
      return origin;
    }
    // For preview deployments, we can be more permissive or have a dynamic system.
    // As a basic approach, we can check if the origin matches a Cloudflare Pages preview URL pattern.
    if (new URL(origin).hostname.endsWith('.strzel-sobie-client.pages.dev')) {
      return origin;
    }
    // Return undefined to disallow other origins
    return undefined;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

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
  const auditService = new AuditService(auditRepository);
  const rangesService = new RangesService(rangesRepository, auditService);
  const userService = new UserService(userRepository, rangesService);
  const authService = new AuthService(
    authRepository,
    sessionRepository,
    userService,
    auditService
  );
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
openapi.post('/api/v1/ranges/:rangeSlug/reservations', authMiddleware, CreateReservation);
openapi.post('/api/v1/ranges/:rangeSlug/records', authMiddleware, CreateRecord);
openapi.get('/api/v1/propositions/:propositionId', authMiddleware, GetPropositionDetail);
openapi.delete('/api/v1/propositions/:propositionId', authMiddleware, DeleteProposition);
openapi.get('/api/v1/reservations/:reservationId', authMiddleware, GetReservationDetail);
openapi.delete('/api/v1/reservations/:reservationId', authMiddleware, DeleteReservation);
openapi.delete(
  '/api/v1/ranges/:rangeSlug/reservations/:reservationId',
  authMiddleware,
  DeleteReservation
);

export default app;
