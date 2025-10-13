import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { MeDto } from '@strzel-sobie/common';
import { Context } from '../../../types';

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
    const session = c.get('session');

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
