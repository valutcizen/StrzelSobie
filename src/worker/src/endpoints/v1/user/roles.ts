import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { Context } from '../../../types';
import { UserService } from '@strzel-sobie/users';

export const RoleSchema = z.object({
  id: z.number(),
  name: z.string(),
  scope: z.enum(['global', 'range']),
});

export class GetRoles extends OpenAPIRoute {
  schema: OpenAPIRouteSchema = {
    summary: 'Get All Roles',
    description: 'Retrieves a list of all user roles available in the system.',
    tags: ['Users'],
    responses: {
      '200': {
        description: 'A list of roles.',
        content: {
          'application/json': {
            schema: z.array(RoleSchema),
          },
        },
      },
      '500': {
        description: 'Internal Server Error',
      },
    },
  };

  async handle(c: Context) {
    const userService: UserService = c.get('userService');
    const result = await userService.getRoles();

    if (result.isSuccess) {
      return c.json(result.getValue());
    } else {
      console.error('Error while fetching roles', result.getError());
      return c.json({ message: 'Failed to retrieve roles' }, 500);
    }
  }
}
