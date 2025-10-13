import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { IUserService, AssignRoleCommand, User } from '@strzel-sobie/common';
import { RoleNotFoundError, RoleScopeError, UserNotFoundError } from '@strzel-sobie/common';

export class SetUserRoleRoute extends OpenAPIRoute {
  schema: OpenAPIRouteSchema = {
    summary: 'Assign a role to a user',
    description: 'Assigns a role to a specific user. This endpoint is restricted to administrators.',
    tags: ['Users'],
    request: {
      params: z.object({
        userId: z.string().transform(Number),
      }),
      body: {
        content: {
          'application/json': {
            schema: z.object({
              roleId: z.number(),
              rangeId: z.number().nullable(),
            }),
          },
        },
      },
    },
    responses: {
      '204': {
        description: 'Role assigned successfully',
      },
      '400': {
        description: 'Invalid input or role scope mismatch',
      },
      '401': {
        description: 'Unauthorized',
      },
      '403': {
        description: 'Forbidden',
      },
      '404': {
        description: 'User, role, or range not found',
      },
    },
  };

  async handle(c: any) {
    const userService: IUserService = c.get('userService');
    const requester = c.get('user') as User;

    // Manual validation
    const params = this.schema.request.params.safeParse(c.req.param());
    if (!params.success) {
      return c.json({ error: 'Invalid path parameter' }, 400);
    }
    const { userId: targetUserId } = params.data;

    const body = await c.req.json();
    const bodyValidation = this.schema.request.body.content['application/json'].schema.safeParse(body);
    if (!bodyValidation.success) {
      return c.json({ error: 'Invalid request body' }, 400);
    }
    const { roleId, rangeId } = bodyValidation.data as AssignRoleCommand;

    const result = await userService.assignRoleToUser({
      targetUserId,
      roleId,
      rangeId,
      requester,
    });

    if (result.isSuccess) {
      return c.json(null, 204);
    }

    const error = result.error;
    if (error instanceof UserNotFoundError || error instanceof RoleNotFoundError) {
      return c.json({ error: error.message }, 404);
    }

    if (error instanceof RoleScopeError) {
      return c.json({ error: error.message }, 400);
    }

    if (error.message === 'Forbidden') {
      return c.json({ error: 'You do not have permission to perform this action.' }, 403);
    }

    return c.json({ error: 'Internal Server Error' }, 500);
  }
}
