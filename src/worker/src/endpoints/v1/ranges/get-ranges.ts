import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { Context } from '../../../types';
import { z } from 'zod';

export class GetRangesRoute extends OpenAPIRoute {
  static schema: OpenAPIRouteSchema = {
    summary: 'Get all shooting ranges',
    tags: ['RangesAdmin'],
    responses: {
      '200': {
        description: 'A list of shooting ranges',
        content: {
          'application/json': {
            schema: z.array(z.object({
              id: z.number(),
              slug: z.string(),
              displayName: z.string(),
            })),
          }
        }
      },
      '500': {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: z.object({
              error: z.string(),
            }),
          }
        }
      },
    },
  };

  async handle(c: Context) {
    const adminService = c.get('adminService');
    const result = await adminService.getRanges();

    if (result.isSuccess) {
      return c.json(result.value, 200);
    }

    console.error(result.error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
}
