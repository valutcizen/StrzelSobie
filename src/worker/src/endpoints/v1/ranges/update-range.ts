import {
  ForbiddenError,
  RANGE_TYPES,
  RangeNotFoundError,
  RangeTypeChangeConfirmationRequiredError,
  UpdateRangeCommand,
  UserDto
} from '@strzel-sobie/common';
import { IRangesService } from '@strzel-sobie/common/models';
import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { Context } from '../../../types';

const paramsSchema = z.object({
  rangeSlug: z.string(),
});
const querySchema = z.object({
  dryRun: z.coerce.boolean().optional().default(false),
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
  type: z.enum(RANGE_TYPES).optional(),
  allowsReservations: z.boolean().optional(),
  publicDescription: z.string().optional().nullable(),
  memberDescription: z.string().optional().nullable(),
  totalTracks: z.number().int().min(0).optional().nullable(),
  operatingHours: operatingHoursSchema.optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  parkingLocation: parkingLocationSchema.nullable().optional(),
  allowMemberEvents: z.boolean().optional(),
  approximateLocation: z.boolean().optional(),
  mapLogoUrl: z.string().trim().url().nullable().optional(),
  voivodeship: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  details: z.string().trim().nullable().optional(),
  confirmTypeChange: z.boolean().optional(),
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
      query: querySchema,
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
      '409': {
        description: 'Type change confirmation required',
      },
    },
  };

  async handle(c: Context) {
    const rangesService = c.get('rangesService') as IRangesService;
    const user = c.get('user') as UserDto;
    const {
      params: { rangeSlug },
      body: command,
      query,
    } = await this.getValidatedData<{
      params: z.infer<typeof paramsSchema>;
      body: UpdateRangeCommand & { confirmTypeChange?: boolean };
      query: z.infer<typeof querySchema>;
    }>();

    if (command.type && command.type !== undefined) {
      const preview = await rangesService.previewRangeTypeChange(rangeSlug, command.type, user);
      if (!preview.isSuccess) {
        const error = preview.getError();
        console.error('Error while previewing range type change', error);
        if (error instanceof RangeNotFoundError) {
          return c.json({ error: error.message }, 404);
        }
        if (error instanceof ForbiddenError) {
          return c.json({ error: error.message }, 403);
        }
        return c.json({ error: 'An unexpected error occurred' }, 500);
      }

      if (query.dryRun) {
        return c.json(preview.getValue(), 200);
      }
    }

    const { confirmTypeChange, ...updateCommand } = command;

    const result = await rangesService.updateRangeDetails(rangeSlug, updateCommand, user, { confirmTypeChange });

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

    if (error instanceof RangeTypeChangeConfirmationRequiredError) {
      return c.json({
        error: error.message,
        code: 'range_type_change_confirmation_required',
        details: error.details,
      }, 409);
    }

    return c.json({ error: 'An unexpected error occurred' }, 500);
  }
}
