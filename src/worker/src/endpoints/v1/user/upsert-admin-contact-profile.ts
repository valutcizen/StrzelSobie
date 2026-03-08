import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { ForbiddenError, IUserService, UserNotFoundError } from '@strzel-sobie/common/models';
import { AppContext } from '../../../types';

const ParamsSchema = z.object({
  userId: z.coerce.number().int().positive('userId must be positive'),
});

const BodySchema = z
  .object({
    email: z.string().email().nullable().optional(),
    phoneNumber: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    isHiddenGlobally: z.boolean().optional(),
  })
  .strict();

export class UpsertAdminContactProfile extends OpenAPIRoute {
  public schema: OpenAPIRouteSchema = {
    summary: 'Upsert admin contact profile',
    tags: ['Users'],
    request: {
      params: ParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: BodySchema,
          },
        },
      },
    },
    responses: {
      '200': { description: 'Profile updated' },
      '403': { description: 'Forbidden' },
      '404': { description: 'User not found' },
    },
  };

  public async handle(c: AppContext) {
    const userService: IUserService = c.get('userService');
    const requester = c.get('user');
    const {
      params,
      body,
    } = await this.getValidatedData<{ params: z.infer<typeof ParamsSchema>; body: z.infer<typeof BodySchema> }>();

    const result = await userService.upsertAdminContactProfile(params.userId, body, requester);
    if (result.isSuccess) {
      return c.json(result.getValue(), 200);
    }

    const error = result.getError();
    if (error instanceof ForbiddenError) {
      return c.json({ code: 'forbidden', message: error.message }, 403);
    }
    if (error instanceof UserNotFoundError) {
      return c.json({ code: 'user_not_found', message: error.message }, 404);
    }
    return c.json({ code: 'internal_error', message: 'Unexpected error occurred' }, 500);
  }
}

