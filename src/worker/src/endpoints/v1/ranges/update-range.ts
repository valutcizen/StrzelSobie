import {
  ForbiddenError,
  IRangesService,
  RangeNotFoundError,
  UpdateRangeCommand,
  UserDto,
} from '@strzel-sobie/common';
import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { Context } from '../../../types';

const paramsSchema = z.object({
  rangeSlug: z.string(),
});

const operatingHoursSchema = z.record(
  z.string(),
  z
    .object({
      open: z.string(),
      close: z.string(),
    })
    .nullable()
);

const updateRangeCommandSchema = z.object({
  totalTracks: z.number().optional(),
  operatingHours: operatingHoursSchema.optional(),
});

export class UpdateRange extends OpenAPIRoute {
  schema: OpenAPIRouteSchema = {
    summary: 'Update a Shooting Range',
    description: 'Partially updates the configuration of a specific shooting range.',
    tags: ['Ranges'],
    request: {
      params: paramsSchema,
      body: {
        content: {
          'application/json': {
            schema: updateRangeCommandSchema,
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Range updated successfully',
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean().openapi({ example: true }),
            }),
          },
        },
      },
      '400': {
        description: 'Bad Request',
      },
      '401': {
        description: 'Unauthorized',
      },
      '403': {
        description: 'Forbidden'
      },
      '404': {
        description: 'Not Found'
      },
    },
  };

  async handle(c: Context) {
    const rangesService = c.get('rangesService') as IRangesService;
    const user = c.get('user') as UserDto;
    const {
      params: { rangeSlug },
      body: command,
    } = await this.getValidatedData<{ params: z.infer<typeof paramsSchema>; body: UpdateRangeCommand }>();

    const result = await rangesService.updateRangeDetails(rangeSlug, command, user);

    if (result.isSuccess) {
      return {
        success: true,
      };
    }

    const error = result.getError();

    if (error instanceof RangeNotFoundError) {
      return c.json({ error: error.message }, 404);
    }

    if (error instanceof ForbiddenError) {
      return c.json({ error: error.message }, 403);
    }

    return c.json({ error: 'An unexpected error occurred' }, 500);
  }
}
