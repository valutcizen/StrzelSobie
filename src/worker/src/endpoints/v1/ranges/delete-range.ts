import { ForbiddenError, RangeNotFoundError, UserDto } from '@strzel-sobie/common';
import { IRangesService } from '@strzel-sobie/common/models';
import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { Context } from '../../../types';

const paramsSchema = z.object({
  rangeSlug: z.string(),
});

export class DeleteRange extends OpenAPIRoute {
  schema: OpenAPIRouteSchema = {
    summary: 'Delete a Shooting Range',
    description: 'Soft-deletes a shooting range so it no longer appears in directory/map.',
    tags: ['Ranges'],
    request: {
      params: paramsSchema,
    },
    responses: {
      '204': {
        description: 'Range deleted successfully',
      },
      '401': {
        description: 'Unauthorized',
      },
      '403': {
        description: 'Forbidden',
      },
      '404': {
        description: 'Not Found',
      },
    },
  };

  async handle(c: Context) {
    const rangesService = c.get('rangesService') as IRangesService;
    const user = c.get('user') as UserDto;
    const {
      params: { rangeSlug },
    } = await this.getValidatedData<{ params: z.infer<typeof paramsSchema> }>();

    const result = await rangesService.deleteRange(rangeSlug, user);

    if (result.isSuccess) {
      return new Response(null, { status: 204 });
    }

    const error = result.getError();
    console.error('Error while deleting range', error);

    if (error instanceof RangeNotFoundError) {
      return c.json({ error: error.message }, 404);
    }

    if (error instanceof ForbiddenError) {
      return c.json({ error: error.message }, 403);
    }

    return c.json({ error: 'An unexpected error occurred' }, 500);
  }
}
