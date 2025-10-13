import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { Context } from '../../../types';
import { UserService } from '@strzel-sobie/users';

const UserDtoSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  isDeleted: z.number(),
  createdAt: z.string(),
});

const PaginatedUsersDtoSchema = z.object({
  data: z.array(UserDtoSchema),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

const GetUsersQueryDtoSchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(10).optional(),
  sortBy: z.enum(['id', 'email', 'createdAt']).default('id').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
  filter: z.string().optional(),
});

export class GetUsers extends OpenAPIRoute {
  schema: OpenAPIRouteSchema = {
    summary: 'Get All Users',
    description: 'Retrieves a paginated list of all users in the system.',
    tags: ['Users'],
    request: {
        query: GetUsersQueryDtoSchema,
    },
    responses: {
      '200': {
        description: 'A paginated list of users.',
        content: {
          'application/json': {
            schema: PaginatedUsersDtoSchema,
          },
        },
      },
      '400': {
        description: 'Bad request',
      },
      '401': {
        description: 'Unauthorized',
      },
      '403': {
        description: 'Forbidden',
      },
      '500': {
        description: 'Internal Server Error',
      },
    },
  };

  async handle(c: Context) {
    const userService: UserService = c.get('userService');
    const query = c.req.valid('query');

    const result = await userService.getUsers(query);

    if (!result.isSuccess) {
        return c.json({ error: result.getError().message }, 500);
    }

    return c.json(result.getValue());
  }
}