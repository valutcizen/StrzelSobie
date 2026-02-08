import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { Context } from '../../../types';

const mapRangeSchema = z.object({
  id: z.union([z.string(), z.number()]),
  slug: z.string(),
  type: z.enum(['club', 'ally', 'coming-soon', 'meetup']).optional(),
  displayName: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  mapLogoUrl: z.string().nullable().optional(),
});

export class GetMapRangesRoute extends OpenAPIRoute {
  schema: OpenAPIRouteSchema = {
    summary: 'Get ranges with coordinates for the embed map',
    tags: ['Ranges'],
    responses: {
      '200': {
        description: 'List of ranges available on the embedded map',
        content: {
          'application/json': {
            schema: z.array(mapRangeSchema),
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
    const result = await rangesService.getRanges();

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
      }));

    return c.json(ranges, 200);
  }
}
