import { ForbiddenError, RangeNotFoundError, UpdateRangeCommand, UserDto } from '@strzel-sobie/common';
import { IRangesService } from '@strzel-sobie/common/models';
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

const parkingLocationSchema = z
  .object({
    latitude: z.number(),
    longitude: z.number(),
  })
  .strict();

const updateRangeCommandSchema = z.object({
  displayName: z.string().trim().min(1).optional(),
  type: z.enum(['club', 'ally', 'coming-soon']).optional(),
  allowsReservations: z.boolean().optional(),
  publicDescription: z.string().optional().nullable(),
  memberDescription: z.string().optional().nullable(),
  totalTracks: z.number().int().min(0).optional().nullable(),
  operatingHours: operatingHoursSchema.optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  parkingLocation: parkingLocationSchema.nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be provided for update',
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
              id: z.number(),
              slug: z.string(),
              displayName: z.string(),
              type: z.string(),
              allowsReservations: z.boolean(),
              publicDescription: z.string().nullable().optional(),
              memberDescription: z.string().nullable().optional(),
              totalTracks: z.number().nullable().optional(),
              operatingHours: operatingHoursSchema,
              latitude: z.number().nullable().optional(),
              longitude: z.number().nullable().optional(),
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
      return c.json({ success: true }, 200);
    }

    const error = result.getError();
    console.error('Error while updating range', error);
    if (error instanceof RangeNotFoundError) {
      return c.json({ error: error.message }, 404);
    }

    if (error instanceof ForbiddenError) {
      return c.json({ error: error.message }, 403);
    }

    return c.json({ error: 'An unexpected error occurred' }, 500);
  }
}
