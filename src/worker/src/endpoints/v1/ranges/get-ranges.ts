import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z, ZodError } from 'zod';
import { RANGE_TYPES, type RangeType } from '@strzel-sobie/common';
import { Context } from '../../../types';

const getRangesQuerySchema = z.object({
  type: z.union([z.enum(RANGE_TYPES), z.array(z.enum(RANGE_TYPES))]).optional(),
});

export class GetRangesRoute extends OpenAPIRoute {
  schema: OpenAPIRouteSchema = {
    summary: 'Get all shooting ranges',
    tags: ['Ranges'],
    request: {
      query: getRangesQuerySchema,
    },
    responses: {
      '200': {
        description: 'A list of shooting ranges',
        content: {
          'application/json': {
            schema: z.array(
              z.object({
                id: z.number(),
                slug: z.string(),
                displayName: z.string(),
                type: z.string(),
                allowsReservations: z.boolean(),
                latitude: z.number().nullable().optional(),
                longitude: z.number().nullable().optional(),
                extras: z
                  .object({
                    allowMemberEvents: z.boolean().optional(),
                    mapLogoUrl: z.string().nullable().optional(),
                    voivodeship: z.string().nullable().optional(),
                    parkingLocation: z
                      .object({
                        latitude: z.number(),
                        longitude: z.number(),
                      })
                      .nullable()
                      .optional(),
                  })
                  .optional(),
              })
            ),
          },
        },
      },
      '400': {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
      },
      '500': {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
      },
    },
  };

  async handle(c: Context) {
    const rangesService = c.get('rangesService');
    let types: RangeType[] | undefined;
    try {
      const parsedTypes = z.array(z.enum(RANGE_TYPES)).optional().parse(new URL(c.req.url).searchParams.getAll('type'));
      types = parsedTypes?.length ? (parsedTypes as RangeType[]) : undefined;
    } catch (error) {
      if (error instanceof ZodError) {
        return c.json({ error: 'Invalid range type filter' }, 400);
      }
      throw error;
    }

    const result = await rangesService.getRanges({ types });

    if (result.isSuccess) {
      return c.json(result.getValue(), 200);
    }

    const error = result.getError();
    console.error('Error while fetching ranges', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
}
