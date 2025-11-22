import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { RangeNotFoundError } from '@strzel-sobie/common';
import { Context } from '../../../types';
import { z } from 'zod';

export class GetRange extends OpenAPIRoute {
  schema: OpenAPIRouteSchema = {
    summary: "Get Range Details",
    description: "Retrieves public details for a specific shooting range.",
    tags: ["Ranges"],
    request:{
      params: z.object({
        rangeSlug: z.string(),
      }),
    },
    responses: {
      "200": {
        description: "Returns range details",
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
              latitude: z.number().nullable().optional(),
              longitude: z.number().nullable().optional(),
              totalTracks: z.number().nullable().optional(),
              operatingHours: z.record(z.any()).optional(),
            }),
          },
        },
      },
      "404": {
        description: "Range not found"
      },
    },
  };

  async handle(c: Context) {
    const { params }: { params: { rangeSlug: string } } =
      await this.getValidatedData<{ params: { rangeSlug: string } }>();
    const rangesService = c.get('rangesService');
    const result = await rangesService.getRangeDetails(params.rangeSlug);

    if (!result.isSuccess) {
      const error = result.getError();
      console.error('Error while fetching range details', error);

      if (error instanceof RangeNotFoundError) {
        return c.json({ error: error.message }, 404);
      }

      return c.json({ error: 'Failed to fetch range details' }, 500);
    }

    return c.json(result.getValue(), 200);
  }
}
