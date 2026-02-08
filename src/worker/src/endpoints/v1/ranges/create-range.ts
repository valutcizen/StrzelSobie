import { ForbiddenError, RangeAlreadyExistsError, Result } from '@strzel-sobie/common';
import { CreateRangeCommand, UserDto } from '@strzel-sobie/common';
import { IRangesService } from '@strzel-sobie/common/models';
import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { Context } from '../../../types';

const operatingHoursSchema = z.record(
  z.string(),
  z
    .object({
      open: z.string(),
      close: z.string(),
    })
    .nullable(),
);

const createRangeCommandSchema = z.object({
  slug: z.string().min(1),
  displayName: z.string().trim().optional(),
  type: z.enum(['club', 'ally', 'coming-soon', 'meetup']).optional(),
  allowsReservations: z.boolean().optional(),
  publicDescription: z.string().optional().nullable(),
  memberDescription: z.string().optional().nullable(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  totalTracks: z.number().int().min(0).optional().nullable(),
  operatingHours: operatingHoursSchema.optional(),
  mapLogoUrl: z.string().trim().url().nullable().optional(),
});

export class CreateRange extends OpenAPIRoute {
  schema: OpenAPIRouteSchema = {
    summary: 'Create a new shooting range',
    description: 'Creates a shooting range using the provided slug and metadata.',
    tags: ['Ranges'],
    request: {
      body: {
        content: {
          'application/json': {
            schema: createRangeCommandSchema,
          },
        },
      },
    },
    responses: {
      '201': {
        description: 'Range created successfully',
      },
      '400': { description: 'Bad Request' },
      '401': { description: 'Unauthorized' },
      '403': { description: 'Forbidden' },
      '409': { description: 'Conflict' },
    },
  };

  async handle(c: Context) {
    const rangesService = c.get('rangesService') as IRangesService;
    const user = c.get('user') as UserDto;
    const { body } = await this.getValidatedData<{ body: CreateRangeCommand }>();

    const result = await rangesService.createRange(body, user);
    if (result.isSuccess) {
      return c.json(result.getValue(), 201);
    }

    const error = result.getError();
    console.error('Error while creating range', error);

    if (error instanceof ForbiddenError) {
      return c.json({ error: error.message }, 403);
    }

    if (error instanceof RangeAlreadyExistsError) {
      return c.json({ error: error.message }, 409);
    }

    if (error instanceof Result) {
      return c.json({ error: error.getError()?.message ?? 'Unexpected error' }, 500);
    }

    return c.json({ error: 'An unexpected error occurred' }, 500);
  }
}
