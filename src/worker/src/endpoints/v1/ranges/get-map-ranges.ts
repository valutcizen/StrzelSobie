import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z, ZodError } from 'zod';
import { RANGE_TYPES, type RangeType } from '@strzel-sobie/common';
import { Context } from '../../../types';

const mapRangeSchema = z.object({
  id: z.union([z.string(), z.number()]),
  slug: z.string(),
  type: z.enum(RANGE_TYPES).optional(),
  displayName: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  mapLogoUrl: z.string().nullable().optional(),
  approximateLocation: z.boolean().optional(),
});

const getMapRangesQuerySchema = z.object({
  type: z.union([z.enum(RANGE_TYPES), z.array(z.enum(RANGE_TYPES))]).optional(),
  scope: z.enum(['embed']).optional(),
});

export class GetMapRangesRoute extends OpenAPIRoute {
  schema: OpenAPIRouteSchema = {
    summary: 'Get ranges with coordinates for the embed map',
    tags: ['Ranges'],
    request: {
      query: getMapRangesQuerySchema,
    },
    responses: {
      '200': {
        description: 'List of ranges available on the embedded map',
        content: {
          'application/json': {
            schema: z.array(mapRangeSchema),
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
    const embedMapConfig = c.get('embedMapConfig');
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

    const scope = new URL(c.req.url).searchParams.get('scope');
    if (scope === 'embed') {
      types = embedMapConfig?.allowedTypes;
    }

    const result = await rangesService.getRanges({ types });

    if (!result.isSuccess) {
      console.error('Error while fetching ranges for map', result.getError());
      return c.json({ error: 'Internal Server Error' }, 500);
    }

    const ranges = result
      .getValue()
      .filter(
        (range) =>
          range.latitude !== null &&
          range.longitude !== null &&
          typeof range.latitude === 'number' &&
          typeof range.longitude === 'number'
      )
      .map((range) => ({
        id: range.id,
        slug: range.slug,
        type: range.type ?? undefined,
        displayName: range.displayName,
        latitude: Number(range.latitude),
        longitude: Number(range.longitude),
        mapLogoUrl:
          typeof range.extras?.mapLogoUrl === 'string' && range.extras.mapLogoUrl.trim().length > 0
            ? range.extras.mapLogoUrl.trim()
            : null,
        approximateLocation: range.extras?.approximateLocation ?? false,
      }));

    return c.json(ranges, 200);
  }
}
