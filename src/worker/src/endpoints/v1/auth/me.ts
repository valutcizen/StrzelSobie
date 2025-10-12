import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { AuthService } from '@strzel-sobie/auth';
import { Context } from '../../../types';
import { getCookie } from 'hono/cookie';
import { MeDto } from '@strzel-sobie/common';

export class Me extends OpenAPIRoute {
  schema: OpenAPIRouteSchema = {
    summary: "Get Current User's Profile",
    description: 'Retrieves the profile of the currently authenticated user based on their session.',
    tags: ['Auth'],
    responses: {
      '200': {
        description: 'User profile retrieved successfully',
        content: {
          'application/json': {
            schema: z.object({
              id: z.number(),
              email: z.string().email(),
              phoneNumber: z.string().nullable(),
              roles: z.array(z.string()),
              rangeRoles: z.record(z.array(z.string())),
            }),
          },
        },
      },
      '401': {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: z.object({
              message: z.string(),
            }),
          },
        },
      },
    },
  };

  async handle(c: Context) {
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

    const meDto: MeDto = {
      id: session.userId,
      email: session.email,
      phoneNumber: session.phoneNumber,
      roles: session.roles,
      rangeRoles: session.rangeRoles,
    };

    return c.json(meDto);
  }
}
