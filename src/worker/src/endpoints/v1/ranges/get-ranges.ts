import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { Context } from '../../../types';
import { z } from 'zod';

export class GetRangesRoute extends OpenAPIRoute {
  schema: OpenAPIRouteSchema = {
    summary: 'Get all shooting ranges',
    tags: ['Ranges'],
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
    const rangesService = c.get('rangesService');
    const result = await rangesService.getRanges();

    if (result.isSuccess) {
      return c.json(result.getValue(), 200);
    }
    console.error('Error while fetching ranges', result.getError());
    return c.json({ error: 'Internal Server Error' }, 500);
  }
}
