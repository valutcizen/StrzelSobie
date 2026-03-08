import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { ForbiddenError, IUserService, RangeNotFoundError, UserNotFoundError } from '@strzel-sobie/common/models';
import { AppContext } from '../../../types';

const ParamsSchema = z.object({
  userId: z.coerce.number().int().positive('userId must be positive'),
  rangeId: z.coerce.number().int().positive('rangeId must be positive'),
});

const BodySchema = z
  .object({
    email: z.string().email().nullable().optional(),
    phoneNumber: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    isHiddenInRange: z.boolean().optional(),
  })
  .strict();

export class UpsertAdminContactProfileOverride extends OpenAPIRoute {
  public schema: OpenAPIRouteSchema = {
    summary: 'Upsert admin contact profile override for range',
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
      '200': { description: 'Profile override updated' },
      '403': { description: 'Forbidden' },
      '404': { description: 'User or range not found' },
    },
  };

  public async handle(c: AppContext) {
    const userService: IUserService = c.get('userService');
    const requester = c.get('user');
    const {
      params,
      body,
    } = await this.getValidatedData<{ params: z.infer<typeof ParamsSchema>; body: z.infer<typeof BodySchema> }>();

    const result = await userService.upsertAdminContactProfileOverride(
      params.userId,
      {
        rangeId: params.rangeId,
        ...body,
      },
      requester
    );
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
    if (error instanceof RangeNotFoundError) {
      return c.json({ code: 'range_not_found', message: error.message }, 404);
    }
    return c.json({ code: 'internal_error', message: 'Unexpected error occurred' }, 500);
  }
}

