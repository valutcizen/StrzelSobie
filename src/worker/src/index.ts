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
import { DeleteUserRoute } from './endpoints/v1/user/delete-user';
import { UpsertAdminContactProfile } from './endpoints/v1/user/upsert-admin-contact-profile';
import { UpsertAdminContactProfileOverride } from './endpoints/v1/user/upsert-admin-contact-profile-override';
import { GetRangesRoute } from './endpoints/v1/ranges/get-ranges';
import { GetRange } from './endpoints/v1/ranges/get-range';
import { CreateRange } from './endpoints/v1/ranges/create-range';
import { UpdateRange } from './endpoints/v1/ranges/update-range';
import { DeleteRange } from './endpoints/v1/ranges/delete-range';
import { GetEvents } from './endpoints/v1/ranges/get-events';
import { CreateEvent } from './endpoints/v1/ranges/create-event';
import { GetEvent } from './endpoints/v1/ranges/get-event';
import { UpdateEvent } from './endpoints/v1/ranges/update-event';
import { DeleteEvent } from './endpoints/v1/ranges/delete-event';
import { CreateEventSignup } from './endpoints/v1/ranges/create-event-signup';
import { UpdateEventSignup } from './endpoints/v1/ranges/update-event-signup';
import { DeleteEventSignup } from './endpoints/v1/ranges/delete-event-signup';
import { CreateProposition } from './endpoints/v1/ranges/create-proposition';
import { CreateRecord } from './endpoints/v1/ranges/create-record';
import { CreateReservation } from './endpoints/v1/ranges/create-reservation';
import { GetMessageTemplates } from './endpoints/v1/ranges/get-message-templates';
import { CreateMessageTemplate } from './endpoints/v1/ranges/create-message-template';
import { UpdateMessageTemplate } from './endpoints/v1/ranges/update-message-template';
import { DeleteProposition } from './endpoints/v1/propositions/delete-proposition';
import { DeleteReservation } from './endpoints/v1/reservations/delete-reservation';
import { GetPropositionDetail } from './endpoints/v1/propositions/get-proposition';
import { GetReservationDetail } from './endpoints/v1/reservations/get-reservation';
import { Env, Variables } from './types';
import { EMBED_MAP_HTML, EMBED_MAP_JS } from '@strzel-sobie/embed-map';
import { GetMapRangesRoute } from './endpoints/v1/ranges/get-map-ranges';
import { RangesDbRepository, RangesService } from '@strzel-sobie/ranges';
import { EventsDbRepository, EventsService } from '@strzel-sobie/events';
import {
  AuthDbRepository,
  SessionKvRepository,
} from '@strzel-sobie/auth';
import { UserDbRepository, UserService } from '@strzel-sobie/users';
import { ReservationsDbRepository, ReservationsService } from '@strzel-sobie/reservations';
import { AuditDbRepository, AuditService } from '@strzel-sobie/audit';
import {
  ConsoleNotificationsEmailSender,
  NotificationsDbRepository,
  NotificationsService,
} from '@strzel-sobie/notifications';
import { authMiddleware } from './middleware/auth';
import { resolveAuthModule } from './auth/module-registry';
import { RANGE_TYPES, Result, type RangeType } from '@strzel-sobie/common';

const EMBED_MAP_ALLOWED_TYPES: RangeType[] = [...RANGE_TYPES];
const EMBED_MAP_CACHE_VERSION = '8';
const EMBED_MAP_CONFIG_VERSION = `types:${EMBED_MAP_ALLOWED_TYPES.join(',')}`;

const cacheEmbedResponse = async (
  cacheKey: string,
  body: string,
  contentType: string,
  cacheControl = 'public, max-age=86400'
): Promise<Response> => {
  const cache = globalThis.caches?.default;
  const request = new Request(cacheKey);

  if (cache) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
  }

  const response = new Response(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
    },
  });

  if (cache) {
    await cache.put(request, response.clone());
  }
  return response;
};

const parseAllowedOrigins = (rawOrigins?: string): string[] =>
  (rawOrigins ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

const createNotificationsService = (env: Env): NotificationsService => {
  const notificationsRepository = new NotificationsDbRepository(env.DB);
  const emailSender =
    env.NOTIFICATIONS_EMAIL_PROVIDER === 'console' && env.NOTIFICATIONS_EMAIL_FROM
      ? new ConsoleNotificationsEmailSender()
      : undefined;
  const retentionDays = env.NOTIFICATIONS_RETENTION_DAYS
    ? Number.parseInt(env.NOTIFICATIONS_RETENTION_DAYS, 10)
    : undefined;

  return new NotificationsService(notificationsRepository, {
    retentionDays,
    emailFrom: env.NOTIFICATIONS_EMAIL_FROM,
    emailSender,
  });
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// CORS Middleware
app.use('/api/*', cors({
  origin: (origin, c) => {
    if (!origin) {
      return undefined;
    }

    const allowedOrigins = parseAllowedOrigins(c.env.ALLOWED_ORIGINS);
    if (allowedOrigins.includes(origin)) {
      return origin;
    }
    // Allow localhost for local development
    if (origin.startsWith('http://localhost:')) {
      return origin;
    }
    // For preview deployments, we can be more permissive or have a dynamic system.
    // As a basic approach, we can check if the origin matches a Cloudflare Pages preview URL pattern.
    try {
      if (new URL(origin).hostname.endsWith('.strzel-sobie-client.pages.dev')) {
        return origin;
      }
    } catch {
      return undefined;
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
  const eventsRepository = new EventsDbRepository(c.env.DB);
  const auditRepository = new AuditDbRepository(c.env.DB);
  const notificationsService = createNotificationsService(c.env);

  // Services
  const auditService = new AuditService(auditRepository);
  let userService: UserService;
  const rangesService = new RangesService(
    rangesRepository,
    auditService,
    async (rangeId, viewer) => {
      if (!userService) {
        return Result.ok([]);
      }
      return userService.getVisibleRangeAdminContacts(rangeId, viewer);
    }
  );
  userService = new UserService(userRepository, rangesService, auditService);
  const eventsService = new EventsService(rangesService, eventsRepository, auditService);
  const authModule = resolveAuthModule(c.env.AUTH_MODULE);
  const authService = authModule.createAuthService({
    authRepository,
    sessionRepository,
    userService,
    auditService,
  });
  const reservationsService = new ReservationsService(
    rangesService,
    reservationsRepository,
    eventsService,
    auditService,
    notificationsService
  );

  c.set('authService', authService);
  c.set('userService', userService);
  c.set('rangesService', rangesService);
  c.set('reservationsService', reservationsService);
  c.set('eventsService', eventsService);
  c.set('auditService', auditService);
  c.set('embedMapConfig', {
    allowedTypes: EMBED_MAP_ALLOWED_TYPES,
    cacheVersion: EMBED_MAP_CACHE_VERSION,
  });

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
openapi.delete('/api/v1/users/:userId', authMiddleware, DeleteUserRoute);
openapi.patch('/api/v1/users/:userId/admin-contact-profile', authMiddleware, UpsertAdminContactProfile);
openapi.patch(
  '/api/v1/users/:userId/admin-contact-profile-overrides/:rangeId',
  authMiddleware,
  UpsertAdminContactProfileOverride
);

openapi.get('/api/v1/ranges', GetRangesRoute);
openapi.get('/api/v1/map-ranges', GetMapRangesRoute);
openapi.get('/api/v1/ranges/:rangeSlug', GetRange);
openapi.post('/api/v1/ranges', authMiddleware, CreateRange);
openapi.patch('/api/v1/ranges/:rangeSlug', authMiddleware, UpdateRange);
openapi.delete('/api/v1/ranges/:rangeSlug', authMiddleware, DeleteRange);

openapi.get('/api/v1/ranges/:rangeSlug/events', GetEvents);
openapi.post('/api/v1/ranges/:rangeSlug/events', authMiddleware, CreateEvent);
openapi.get('/api/v1/ranges/:rangeSlug/events/:eventSlug', GetEvent);
openapi.patch('/api/v1/ranges/:rangeSlug/events/:eventSlug', authMiddleware, UpdateEvent);
openapi.delete('/api/v1/ranges/:rangeSlug/events/:eventSlug', authMiddleware, DeleteEvent);
openapi.post(
  '/api/v1/ranges/:rangeSlug/events/:eventSlug/signups',
  authMiddleware,
  CreateEventSignup
);
openapi.patch(
  '/api/v1/ranges/:rangeSlug/events/:eventSlug/signups/me',
  authMiddleware,
  UpdateEventSignup
);
openapi.delete(
  '/api/v1/ranges/:rangeSlug/events/:eventSlug/signups/me',
  authMiddleware,
  DeleteEventSignup
);
openapi.post('/api/v1/ranges/:rangeSlug/propositions', authMiddleware, CreateProposition);
openapi.post('/api/v1/ranges/:rangeSlug/reservations', authMiddleware, CreateReservation);
openapi.post('/api/v1/ranges/:rangeSlug/records', authMiddleware, CreateRecord);
openapi.get('/api/v1/ranges/:rangeSlug/message-templates', authMiddleware, GetMessageTemplates);
openapi.post('/api/v1/ranges/:rangeSlug/message-templates', authMiddleware, CreateMessageTemplate);
openapi.patch('/api/v1/message-templates/:templateId', authMiddleware, UpdateMessageTemplate);
openapi.get('/api/v1/propositions/:propositionId', authMiddleware, GetPropositionDetail);
openapi.delete('/api/v1/propositions/:propositionId', authMiddleware, DeleteProposition);
openapi.get('/api/v1/reservations/:reservationId', authMiddleware, GetReservationDetail);
openapi.delete('/api/v1/reservations/:reservationId', authMiddleware, DeleteReservation);
openapi.delete(
  '/api/v1/ranges/:rangeSlug/reservations/:reservationId',
  authMiddleware,
  DeleteReservation
);

app.get('/embed/map', async (_c) => {
  // Cache by path only.
  const cacheKey = `https://cache.strzel-sobie/embed/map?v=${EMBED_MAP_CACHE_VERSION}&cfg=${EMBED_MAP_CONFIG_VERSION}`;
  const html = EMBED_MAP_HTML.replace(
    'src="/embed/map.js"',
    `src="/embed/map.js?v=${EMBED_MAP_CACHE_VERSION}"`,
  );
  return cacheEmbedResponse(
    cacheKey,
    html,
    'text/html; charset=utf-8',
    'no-store',
  );
});

app.get('/embed/map.js', async (_c) => {
  const cacheKey = `https://cache.strzel-sobie/embed/map.js?v=${EMBED_MAP_CACHE_VERSION}&cfg=${EMBED_MAP_CONFIG_VERSION}`;
  return cacheEmbedResponse(cacheKey, EMBED_MAP_JS, 'application/javascript; charset=utf-8');
});

const worker = {
  fetch: app.fetch,
  scheduled: async (_controller: unknown, env: Env, _ctx: unknown) => {
    const notificationsService = createNotificationsService(env);
    const result = await notificationsService.cleanupExpiredNotifications();
    if (!result.isSuccess) {
      console.error('Scheduled notifications cleanup failed', result.getError());
      return;
    }
    const cleanup = result.getValue();
    const expiredCount =
      typeof cleanup === 'number' ? cleanup : cleanup.expiredCount;
    const expiredFailedEmailCount =
      typeof cleanup === 'number' ? 0 : cleanup.expiredFailedEmailCount;
    console.info('Scheduled notifications cleanup completed', {
      expiredCount,
      expiredFailedEmailCount,
    });
  },
};

export default worker;
