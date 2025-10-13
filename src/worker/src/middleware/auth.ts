
import { getCookie } from 'hono/cookie';
import { AuthService } from '@strzel-sobie/auth';
import { MiddlewareHandler } from 'hono';

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authService: AuthService = c.get('authService');
  const sessionToken = getCookie(c, 'session_token');

  if (!sessionToken) {
    return c.json({ message: 'Unauthorized' }, 401);
  }

  const sessionResult = await authService.validateSession(sessionToken);

  if (!sessionResult.isSuccess) {
    return c.json({ message: 'Unauthorized' }, 401);
  }

  const session = sessionResult.getValue();

  if (!session) {
    return c.json({ message: 'Unauthorized' }, 401);
  }

  c.set('session', session);

  await next();
};
