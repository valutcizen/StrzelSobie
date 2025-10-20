import { fromHono, type OpenAPIHono } from 'chanfana';
import { Hono } from 'hono';
import { z } from 'zod';

export type WorkerTestDependencies = Partial<Record<
  'authService' | 'userService' | 'rangesService' | 'reservationsService' | 'auditService' | 'session' | 'user',
  unknown
>>;

type CreateWorkerClientOptions = {
  register: (router: OpenAPIHono) => void;
  dependencies?: WorkerTestDependencies;
  setupApp?: (app: Hono) => void;
};

/**
 * Builds a lightweight worker app with the provided dependencies and routes.
 * Routes should be registered on the supplied OpenAPI router to retain schema-driven validation.
 */
type RequestOptions = RequestInit & { json?: unknown };

export function createWorkerTestClient({ register, dependencies = {}, setupApp }: CreateWorkerClientOptions) {
  const zodPrototype = (z as unknown as { ZodType: { prototype: Record<string, unknown> } }).ZodType
    ?.prototype as Record<string, unknown>;
  if (zodPrototype && typeof zodPrototype.openapi !== 'function') {
    zodPrototype.openapi = function openapi(this: unknown) {
      return this;
    };
  }

  const app = new Hono();

  app.use('*', async (c, next) => {
    for (const [key, value] of Object.entries(dependencies)) {
      if (value !== undefined) {
        c.set(key as never, value as never);
      }
    }

    await next();
  });

  const router = fromHono(app, { docs_url: '/docs' });
  if (setupApp) {
    setupApp(app);
  }
  register(router);

  const normalizeInit = (method: string, init: RequestOptions = {}) => {
    const { json, headers, ...rest } = init;
    const finalInit: RequestInit = { ...rest, method };

    if (json !== undefined) {
      finalInit.body = JSON.stringify(json);
      finalInit.headers = {
        'Content-Type': 'application/json',
        ...headers,
      };
    } else if (headers) {
      finalInit.headers = headers;
    }

    return finalInit;
  };

  const client = {
    request: (path: string, init?: RequestOptions) => app.request(path, init),
    get: (path: string, init?: RequestOptions) => app.request(path, normalizeInit('GET', init)),
    post: (path: string, init?: RequestOptions) => app.request(path, normalizeInit('POST', init)),
    patch: (path: string, init?: RequestOptions) => app.request(path, normalizeInit('PATCH', init)),
    delete: (path: string, init?: RequestOptions) => app.request(path, normalizeInit('DELETE', init)),
  };

  return { app, client, dependencies };
}
