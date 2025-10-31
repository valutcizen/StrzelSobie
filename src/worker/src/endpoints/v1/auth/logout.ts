import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { getCookie, setCookie } from 'hono/cookie';
import { Context } from '../../../types';
import { AuthService } from '@strzel-sobie/auth';

export class Logout extends OpenAPIRoute {
  schema: OpenAPIRouteSchema = {
    summary: 'User Logout',
    description: 'Terminates the current user session.',
    tags: ['Auth'],
    request: {},
    responses: {
      '200': {
        description: 'Logout successful',
        content: {
          'application/json': {
            schema: z.null(),
          },
        },
      },
      '401': {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
      },
    },
  };

  async handle(c: Context) {
    const sessionToken = getCookie(c, 'session_token');

    if (!sessionToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const authService: AuthService = c.get('authService');
    await authService.logout(sessionToken);

    setCookie(c, 'session_token', '', {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 0,
    });

    return c.json({ message: 'Logout successful.' }, 200);
  }
}
