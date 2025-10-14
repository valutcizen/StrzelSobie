
import { getCookie } from 'hono/cookie';
import { AuthService } from '@strzel-sobie/auth';
import { MiddlewareHandler } from 'hono';
import { IUserService } from '@strzel-sobie/common';

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
  const userService: IUserService = c.get('userService');
  const userResult = await userService.getUserById(session.userId.toString());

  if (!userResult.isSuccess) {
    return c.json({ message: 'Unauthorized' }, 401);
  }

  const user = userResult.getValue();

  if (!user) {
    return c.json({ message: 'Unauthorized' }, 401);
  }

  c.set('user', user);

  await next();
};
