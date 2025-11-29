import { ForbiddenError, UserNotFoundError } from '@strzel-sobie/common';
import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';

export class DeleteUserRoute extends OpenAPIRoute {
  schema: OpenAPIRouteSchema = {
    summary: 'Delete user',
    description: 'Soft deletes a user by appending a timestamp to their email and marking them as removed.',
    tags: ['Users'],
    request: {
      params: z.object({
        userId: z.string(),
      }),
    },
    responses: {
      '204': {
        description: 'User deleted successfully',
      },
      '401': { description: 'Unauthorized' },
      '403': { description: 'Forbidden' },
      '404': { description: 'User not found' },
      '500': { description: 'Internal Server Error' },
    },
  };

  async handle(c) {
    const { params } = await this.getValidatedData();
    const userService = c.get('userService');
    const requester = c.get('user');

    const result = await userService.deleteUser({
      targetUserId: parseInt(params.userId, 10),
      requester,
    });

    if (result.isSuccess) {
      return new Response(null, { status: 204 });
    }

    const error = result.error;
    console.error('Error while deleting user', error);

    if (error instanceof UserNotFoundError) {
      return c.json({ error: error.message }, 404);
    }

    if (error instanceof ForbiddenError) {
      return c.json({ error: error.message }, 403);
    }

    return c.json({ error: 'Internal Server Error' }, 500);
  }
}
